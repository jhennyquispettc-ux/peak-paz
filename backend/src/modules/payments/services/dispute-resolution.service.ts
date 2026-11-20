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
  BookingSource,
  BookingStatus,
  DisputeDecision,
  DisputeStatus,
} from '../../bookings/bookings.enums.js';
import {
  DisputeDto,
  DisputePageDto,
  DisputeQueryDto,
} from '../../bookings/dto/tour-check.dto.js';
import {
  DisputeNotFoundException,
  DisputeResolvedException,
  InvalidBookingStatusException,
} from '../../bookings/exceptions/bookings.exceptions.js';
import { BookingsRepository } from '../../bookings/repositories/bookings.repository.js';
import { DisputesRepository } from '../../bookings/repositories/disputes.repository.js';
import { StrikeIssuerService } from '../../strikes/services/strike-issuer.service.js';
import { ProviderKind } from '../../strikes/sanctions.js';
import { StrikeReason } from '../../strikes/strikes.enums.js';
import {
  DisputeResolutionDto,
  ResolveDisputeDto,
} from '../dto/dispute-resolution.dto.js';
import { RefundDto } from '../dto/payment.dto.js';
import { RefundReason } from '../payments.enums.js';
import { BookingCancellationService } from './booking-cancellation.service.js';
import { PayoutsService } from './payouts.service.js';

const NO_SHOW_STRIKE_WEIGHT = 2;
const NO_SHOW_REASON = 'El guía no se presentó al tour';
const RUNNING = new Set([BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS]);

@Injectable()
export class DisputeResolutionService {
  constructor(
    private readonly disputes: DisputesRepository,
    private readonly bookings: BookingsRepository,
    private readonly cancellations: BookingCancellationService,
    private readonly payouts: PayoutsService,
    private readonly issuer: StrikeIssuerService,
    private readonly notices: NotificationsService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async list(query: DisputeQueryDto): Promise<DisputePageDto> {
    const [disputes, total] = await this.disputes.findPage({
      skip: query.skip,
      take: query.limit,
      status: query.status,
    });
    return {
      data: disputes.map((dispute) => DisputeDto.fromEntity(dispute)),
      meta: PaginationMetaDto.of(query.page, query.limit, total),
    };
  }

  async get(id: string): Promise<DisputeDto> {
    const dispute = await this.disputes.findById(id);
    if (!dispute) throw new DisputeNotFoundException();
    return DisputeDto.fromEntity(dispute);
  }

  async resolve(
    adminId: string,
    id: string,
    dto: ResolveDisputeDto,
  ): Promise<DisputeResolutionDto> {
    const outcome = await this.dataSource.transaction(async (manager) => {
      await this.disputes.lockById(id, manager);
      const dispute = await this.disputes.findById(id, manager);
      if (!dispute) throw new DisputeNotFoundException();
      if (dispute.status !== DisputeStatus.OPEN) {
        throw new DisputeResolvedException();
      }
      const booking = await this.bookings.findForUpdate(
        dispute.bookingId,
        manager,
      );
      const detail = await this.bookings.findDetailById(
        dispute.bookingId,
        manager,
      );
      if (!booking || !detail || !RUNNING.has(booking.status)) {
        throw new InvalidBookingStatusException(booking?.status ?? 'missing');
      }
      const now = new Date();

      let refund: RefundDto | null = null;
      let strikeId: string | null = null;
      let activeStrikes: number | null = null;
      let sanction = null;

      if (dto.decision === DisputeDecision.TOUR_HAPPENED) {
        detail.status = BookingStatus.COMPLETED;
        await this.bookings.save(detail, manager);
        if (detail.source === BookingSource.WEB) {
          await this.payouts.createForBooking(detail, manager);
        }
      } else {
        refund = await this.cancellations.cancelByProviderWithRefund(
          detail,
          RefundReason.PROVIDER_CANCELLATION,
          NO_SHOW_REASON,
          now,
          manager,
        );
        const issued = await this.issuer.issue(
          {
            provider: {
              kind: ProviderKind.GUIDE,
              id: detail.guideProfileId!,
            },
            subjectId: detail.id,
            reason: StrikeReason.NO_SHOW,
            weight: NO_SHOW_STRIKE_WEIGHT,
            adminId,
          },
          now,
          manager,
        );
        strikeId = issued.strikeId;
        activeStrikes = issued.sanction.activeStrikes;
        sanction = issued.sanction.level;
      }

      dispute.status = DisputeStatus.RESOLVED;
      dispute.decision = dto.decision;
      dispute.resolution = dto.resolution;
      dispute.resolvedById = adminId;
      dispute.resolvedAt = now;
      await this.disputes.save(dispute, manager);
      const notice = bookingNotice(detail, {
        decision: dto.decision,
        resolution: dto.resolution,
      });
      for (const userId of [detail.touristId, providerUserIdOf(detail)]) {
        await this.notices.notify(
          manager,
          userId,
          NotificationType.DISPUTE_RESOLVED,
          notice,
        );
      }
      return { refund, strikeId, activeStrikes, sanction };
    });

    return {
      dispute: await this.get(id),
      refund: outcome.refund,
      strike: outcome.strikeId
        ? await this.issuer.findDto(outcome.strikeId)
        : null,
      activeStrikes: outcome.activeStrikes,
      sanction: outcome.sanction,
    };
  }
}
