import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { PaginationMetaDto } from '../../../common/dto/pagination-meta.dto.js';
import { AgencyNotFoundException } from '../../agencies/exceptions/agencies.exceptions.js';
import { AgenciesRepository } from '../../agencies/repositories/agencies.repository.js';
import { Booking } from '../../bookings/entities/booking.entity.js';
import { GuideNotFoundException } from '../../guides/exceptions/guides.exceptions.js';
import { GuidesRepository } from '../../guides/repositories/guides.repository.js';
import { SettingsService } from '../../settings/services/settings.service.js';
import { SettingKey } from '../../settings/setting-keys.js';
import { GroupDeparturesRepository } from '../../group-departures/repositories/group-departures.repository.js';
import { ProviderKind, SanctionedProvider } from '../../strikes/sanctions.js';
import { FinesService } from '../../strikes/services/fines.service.js';
import { PayoutDto, PayoutPageDto, PayoutQueryDto } from '../dto/payout.dto.js';
import {
  PayoutAlreadyPaidException,
  PayoutNotFoundException,
} from '../exceptions/payments.exceptions.js';
import { splitPayout } from '../money.js';
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
  ) {}

  async createForBooking(
    booking: Booking,
    manager: EntityManager,
  ): Promise<void> {
    if (await this.payouts.existsForBooking(booking.id, manager)) return;
    const commissionRate = await this.settings.getNumber(
      SettingKey.COMMISSION_RATE,
    );
    const beforeFines = splitPayout(booking.totalAmount, commissionRate);
    const provider = await this.providerOf(booking, manager);
    const penaltyDeduction = provider
      ? await this.fines.settle(provider, beforeFines.netAmount, manager)
      : 0;
    const { commissionAmount, netAmount } = splitPayout(
      booking.totalAmount,
      commissionRate,
      penaltyDeduction,
    );
    await this.payouts.insertIfMissing(
      {
        bookingId: booking.id,
        grossAmount: booking.totalAmount,
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

  async markPaid(id: string): Promise<PayoutDto> {
    const payout = await this.payouts.findById(id);
    if (!payout) throw new PayoutNotFoundException();
    if (payout.status === PayoutStatus.PAID) {
      throw new PayoutAlreadyPaidException();
    }
    payout.status = PayoutStatus.PAID;
    payout.paidAt = new Date();
    await this.payouts.save(payout);
    return PayoutDto.fromEntity(payout);
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
    return {
      data: payouts.map((payout) => PayoutDto.fromEntity(payout)),
      meta: PaginationMetaDto.of(query.page, query.limit, total),
    };
  }
}
