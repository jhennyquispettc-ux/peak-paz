import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { PaginationMetaDto } from '../../../common/dto/pagination-meta.dto.js';
import { AgencyNotFoundException } from '../../agencies/exceptions/agencies.exceptions.js';
import { AgenciesRepository } from '../../agencies/repositories/agencies.repository.js';
import { bookingEndsAt } from '../../bookings/booking-schedule.js';
import { Booking } from '../../bookings/entities/booking.entity.js';
import { GuideNotFoundException } from '../../guides/exceptions/guides.exceptions.js';
import { GuidesRepository } from '../../guides/repositories/guides.repository.js';
import { SettingsService } from '../../settings/services/settings.service.js';
import { SettingKey } from '../../settings/setting-keys.js';
import { GroupDeparturesRepository } from '../../group-departures/repositories/group-departures.repository.js';
import { ProviderKind, SanctionedProvider } from '../../strikes/sanctions.js';
import { ComplaintsRepository } from '../../strikes/repositories/complaints.repository.js';
import { FinesService } from '../../strikes/services/fines.service.js';
import { PayoutDto, PayoutPageDto, PayoutQueryDto } from '../dto/payout.dto.js';
import {
  PayoutAlreadyPaidException,
  PayoutNotFoundException,
  PayoutNotReadyException,
  PayoutOnHoldException,
} from '../exceptions/payments.exceptions.js';
import { round2, splitPayout } from '../money.js';
import { PayoutStage, payableFrom, payoutStage } from '../payout-rules.js';
import { PayoutStatus } from '../payments.enums.js';
import { PayoutsRepository } from '../repositories/payouts.repository.js';

@Injectable()
export class PayoutsService {
  constructor(
    private readonly payouts: PayoutsRepository,
    private readonly guides: GuidesRepository,
    private readonly agencies: AgenciesRepository,
    private readonly settings: SettingsService,
    private readonly fines: FinesService,
    private readonly departures: GroupDeparturesRepository,
    private readonly complaints: ComplaintsRepository,
  ) {}

  async createForBooking(
    booking: Booking,
    manager: EntityManager,
    grossAmount = booking.totalAmount,
  ): Promise<void> {
    if (await this.payouts.existsForBooking(booking.id, manager)) return;
    const commissionRate = await this.settings.getNumber(
      SettingKey.COMMISSION_RATE,
    );
    const beforeFines = splitPayout(grossAmount, commissionRate);
    const provider = await this.providerOf(booking, manager);
    const penaltyDeduction = provider
      ? await this.fines.settle(provider, beforeFines.netAmount, manager)
      : 0;
    const { commissionAmount, netAmount } = splitPayout(
      grossAmount,
      commissionRate,
      penaltyDeduction,
    );
    await this.payouts.insertIfMissing(
      {
        bookingId: booking.id,
        grossAmount,
        commissionRate,
        commissionAmount,
        penaltyDeduction,
        netAmount,
        status: PayoutStatus.PENDING,
      },
      manager,
    );
  }

  private async providerOf(
    booking: Booking,
    manager: EntityManager,
  ): Promise<SanctionedProvider | null> {
    if (booking.guideProfileId) {
      return { kind: ProviderKind.GUIDE, id: booking.guideProfileId };
    }
    if (!booking.groupDepartureId) return null;
    const departure = await this.departures.findById(
      booking.groupDepartureId,
      manager,
    );
    return departure
      ? { kind: ProviderKind.AGENCY, id: departure.agencyId }
      : null;
  }

  listAll(query: PayoutQueryDto): Promise<PayoutPageDto> {
    return this.page(query);
  }

  async listForGuide(
    userId: string,
    query: PayoutQueryDto,
  ): Promise<PayoutPageDto> {
    const profile = await this.guides.findIdByUserId(userId);
    if (!profile) throw new GuideNotFoundException();
    return this.page(query, profile.id);
  }

  async listForAgency(
    userId: string,
    query: PayoutQueryDto,
  ): Promise<PayoutPageDto> {
    const agency = await this.agencies.findIdByUserId(userId);
    if (!agency) throw new AgencyNotFoundException();
    return this.page(query, undefined, agency.id);
  }

  async deductFromPending(
    bookingId: string,
    amount: number,
    manager: EntityManager,
  ): Promise<number> {
    const payout = await this.payouts.findPendingForBookingForUpdate(
      bookingId,
      manager,
    );
    if (!payout || amount <= 0) return 0;
    const applied = round2(Math.min(amount, payout.netAmount));
    payout.penaltyDeduction = round2(payout.penaltyDeduction + applied);
    payout.netAmount = round2(payout.netAmount - applied);
    await this.payouts.saveWith(payout, manager);
    return applied;
  }

  async markPaid(id: string): Promise<PayoutDto> {
    const payout = await this.payouts.findById(id);
    if (!payout) throw new PayoutNotFoundException();
    if (await this.complaints.hasOpenForBooking(payout.bookingId)) {
      throw new PayoutOnHoldException();
    }
    if (payout.status === PayoutStatus.PAID) {
      throw new PayoutAlreadyPaidException();
    }
    const windowHours = await this.settings.getNumber(
      SettingKey.COMPLAINT_WINDOW_HOURS,
    );
    const payableAt = payableFrom(bookingEndsAt(payout.booking), windowHours);
    const now = new Date();
    if (now < payableAt) throw new PayoutNotReadyException(payableAt);
    payout.status = PayoutStatus.PAID;
    payout.paidAt = now;
    await this.payouts.save(payout);
    return PayoutDto.fromEntity(payout, {
      stage: PayoutStage.PAID,
      payableAt,
    });
  }

  private async page(
    query: PayoutQueryDto,
    guideProfileId?: string,
    agencyId?: string,
  ): Promise<PayoutPageDto> {
    const [payouts, total] = await this.payouts.findPage({
      skip: query.skip,
      take: query.limit,
      status: query.status,
      guideProfileId,
      agencyId,
    });
    const windowHours = await this.settings.getNumber(
      SettingKey.COMPLAINT_WINDOW_HOURS,
    );
    const open = await this.complaints.openBookingIds(
      payouts.map((payout) => payout.bookingId),
    );
    const now = new Date();
    return {
      data: payouts.map((payout) => {
        const payableAt = payableFrom(
          bookingEndsAt(payout.booking),
          windowHours,
        );
        return PayoutDto.fromEntity(payout, {
          payableAt,
          stage: payoutStage({
            paid: payout.status === PayoutStatus.PAID,
            hasOpenComplaint: open.has(payout.bookingId),
            payableAt,
            now,
          }),
        });
      }),
      meta: PaginationMetaDto.of(query.page, query.limit, total),
    };
  }
}
