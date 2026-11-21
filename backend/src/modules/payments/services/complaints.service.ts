import { NotificationsService } from '../../notifications/services/notifications.service.js';
import { NotificationType } from '../../notifications/notifications.enums.js';
import {
  bookingNotice,
  providerUserIdOf,
} from '../../notifications/booking-notice.js';
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PaginationMetaDto } from '../../../common/dto/pagination-meta.dto.js';
import {
  bookingEndsAt,
  bookingStartsAt,
} from '../../bookings/booking-schedule.js';
import { BookingStatus } from '../../bookings/bookings.enums.js';
import { Booking } from '../../bookings/entities/booking.entity.js';
import {
  BookingNotFoundException,
  InvalidBookingStatusException,
  NoShowReportTooEarlyException,
} from '../../bookings/exceptions/bookings.exceptions.js';
import { BookingsRepository } from '../../bookings/repositories/bookings.repository.js';
import { SettingsService } from '../../settings/services/settings.service.js';
import { SettingKey } from '../../settings/setting-keys.js';
import { ComplaintsRepository } from '../../strikes/repositories/complaints.repository.js';
import {
  ProviderKind,
  SanctionedProvider,
  SanctionLevel,
} from '../../strikes/sanctions.js';
import { StrikeIssuerService } from '../../strikes/services/strike-issuer.service.js';
import {
  ComplaintReason,
  ComplaintStatus,
  StrikeReason,
} from '../../strikes/strikes.enums.js';
import { canComplain, deductionFor } from '../complaint-rules.js';
import {
  ComplaintDto,
  ComplaintPageDto,
  ComplaintQueryDto,
  ComplaintResolutionDto,
  ResolveComplaintDto,
} from '../dto/complaint.dto.js';
import { RefundDto } from '../dto/payment.dto.js';
import {
  ComplaintAlreadyExistsException,
  ComplaintNotFoundException,
  ComplaintNotResolvableException,
  ComplaintOptionsNotAllowedException,
  ComplaintResolvedException,
  ComplaintWindowClosedException,
  RefundPercentRequiredException,
} from '../exceptions/payments.exceptions.js';
import { round2 } from '../money.js';
import { RefundReason } from '../payments.enums.js';
import { BookingCancellationService } from './booking-cancellation.service.js';
import { PayoutsService } from './payouts.service.js';

const COMPLAINABLE = new Set([
  BookingStatus.CONFIRMED,
  BookingStatus.IN_PROGRESS,
  BookingStatus.COMPLETED,
]);
const RUNNING = new Set([BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS]);
const NO_SHOW_STRIKE_WEIGHT = 2;
const MS_PER_MINUTE = 60_000;

@Injectable()
export class ComplaintsService {
  constructor(
    private readonly complaints: ComplaintsRepository,
    private readonly bookings: BookingsRepository,
    private readonly cancellations: BookingCancellationService,
    private readonly payouts: PayoutsService,
    private readonly issuer: StrikeIssuerService,
    private readonly settings: SettingsService,
    private readonly notices: NotificationsService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async open(
    touristId: string,
    bookingId: string,
    description: string,
    reason: ComplaintReason = ComplaintReason.GENERAL,
  ): Promise<ComplaintDto> {
    const [windowHours, toleranceMinutes] = await Promise.all([
      this.settings.getNumber(SettingKey.COMPLAINT_WINDOW_HOURS),
      this.settings.getNumber(SettingKey.NO_SHOW_TOLERANCE_MIN),
    ]);
    await this.dataSource.transaction(async (manager) => {
      await this.bookings.findForUpdate(bookingId, manager);
      const booking = await this.bookings.findDetailById(bookingId, manager);
      if (!booking || booking.touristId !== touristId) {
        throw new BookingNotFoundException();
      }
      if (!COMPLAINABLE.has(booking.status)) {
        throw new InvalidBookingStatusException(booking.status);
      }
      const now = new Date();
      const startsAt = bookingStartsAt(booking);
      if (!canComplain(now, startsAt, bookingEndsAt(booking), windowHours)) {
        throw new ComplaintWindowClosedException(windowHours);
      }
      if (
        reason === ComplaintReason.NO_SHOW &&
        now.getTime() < startsAt.getTime() + toleranceMinutes * MS_PER_MINUTE
      ) {
        throw new NoShowReportTooEarlyException();
      }
      if (await this.complaints.existsForBooking(booking.id, manager)) {
        throw new ComplaintAlreadyExistsException();
      }
      await this.complaints.create(
        { bookingId: booking.id, description, reason },
        manager,
      );
      await this.notices.notifyAdmins(manager, NotificationType.CASE_OPENED, {
        kind: 'COMPLAINT_CASE',
        code: booking.code,
        section: 'reclamos',
      });
      await this.notices.notify(
        manager,
        providerUserIdOf(booking),
        NotificationType.COMPLAINT_RECEIVED,
        bookingNotice(booking),
      );
    });
    return this.getForTourist(touristId, bookingId);
  }

  async getForTourist(
    touristId: string,
    bookingId: string,
  ): Promise<ComplaintDto> {
    const complaint = await this.complaints.findByBooking(bookingId);
    if (!complaint || complaint.booking.touristId !== touristId) {
      throw new ComplaintNotFoundException();
    }
    return ComplaintDto.fromEntity(complaint);
  }

  async list(query: ComplaintQueryDto): Promise<ComplaintPageDto> {
    const [complaints, total] = await this.complaints.findPage({
      skip: query.skip,
      take: query.limit,
      status: query.status,
    });
    return {
      data: complaints.map((complaint) => ComplaintDto.fromEntity(complaint)),
      meta: PaginationMetaDto.of(query.page, query.limit, total),
    };
  }

  async get(id: string): Promise<ComplaintDto> {
    const complaint = await this.complaints.findById(id);
    if (!complaint) throw new ComplaintNotFoundException();
    return ComplaintDto.fromEntity(complaint);
  }

  async resolve(
    adminId: string,
    id: string,
    dto: ResolveComplaintDto,
  ): Promise<ComplaintResolutionDto> {
    const accepted = dto.decision === ComplaintStatus.ACCEPTED;
    if (!accepted && (dto.refundPercent !== undefined || dto.strike)) {
      throw new ComplaintOptionsNotAllowedException();
    }

    const outcome = await this.dataSource.transaction(async (manager) => {
      await this.complaints.lockById(id, manager);
      const complaint = await this.complaints.findById(id, manager);
      if (!complaint) throw new ComplaintNotFoundException();
      if (complaint.status !== ComplaintStatus.OPEN) {
        throw new ComplaintResolvedException();
      }
      await this.bookings.findForUpdate(complaint.bookingId, manager);
      const booking = complaint.booking;
      if (
        RUNNING.has(booking.status) ||
        (accepted && booking.status !== BookingStatus.COMPLETED)
      ) {
        throw new ComplaintNotResolvableException();
      }
      const isNoShow = complaint.reason === ComplaintReason.NO_SHOW;
      if (accepted && !isNoShow && dto.refundPercent === undefined) {
        throw new RefundPercentRequiredException();
      }
      const now = new Date();

      let refund: RefundDto | null = null;
      let strikeId: string | null = null;
      let activeStrikes: number | null = null;
      let sanction: SanctionLevel | null = null;

      if (accepted) {
        const percent = isNoShow ? 100 : dto.refundPercent!;
        refund = await this.cancellations.refundShare(
          booking,
          percent,
          RefundReason.COMPLAINT,
          manager,
        );
        const deduction = refund
          ? deductionFor(booking.totalAmount, percent)
          : 0;
        complaint.refundPercent = percent;
        complaint.deductionAmount = deduction;
        complaint.deductionSettled = await this.payouts.deductFromPending(
          booking.id,
          deduction,
          manager,
        );
        if (isNoShow || dto.strike) {
          const provider = this.providerOf(booking);
          const issued = await this.issuer.issue(
            {
              provider,
              subjectId:
                provider.kind === ProviderKind.GUIDE
                  ? booking.id
                  : booking.groupDepartureId!,
              reason: isNoShow ? StrikeReason.NO_SHOW : StrikeReason.COMPLAINT,
              weight: isNoShow ? NO_SHOW_STRIKE_WEIGHT : 1,
              adminId,
            },
            now,
            manager,
          );
          strikeId = issued.strikeId;
          activeStrikes = issued.sanction.activeStrikes;
          sanction = issued.sanction.level;
        }
      }

      complaint.status = dto.decision;
      complaint.resolution = dto.resolution;
      complaint.resolvedById = adminId;
      complaint.resolvedAt = now;
      complaint.deductionSettled = round2(complaint.deductionSettled);
      await this.complaints.save(complaint, manager);
      const notice = bookingNotice(booking, {
        decision: dto.decision,
        refundPercent: complaint.refundPercent ?? 0,
        resolution: dto.resolution,
      });
      for (const userId of [booking.touristId, providerUserIdOf(booking)]) {
        await this.notices.notify(
          manager,
          userId,
          NotificationType.COMPLAINT_RESOLVED,
          notice,
        );
      }
      return { refund, strikeId, activeStrikes, sanction };
    });

    return {
      complaint: await this.get(id),
      refund: outcome.refund,
      strike: outcome.strikeId
        ? await this.issuer.findDto(outcome.strikeId)
        : null,
      activeStrikes: outcome.activeStrikes,
      sanction: outcome.sanction,
    };
  }

  private providerOf(booking: Booking): SanctionedProvider {
    return booking.guideProfileId
      ? { kind: ProviderKind.GUIDE, id: booking.guideProfileId }
      : { kind: ProviderKind.AGENCY, id: booking.groupDeparture!.agencyId };
  }
}
