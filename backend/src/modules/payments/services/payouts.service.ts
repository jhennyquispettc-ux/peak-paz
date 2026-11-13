import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { PaginationMetaDto } from '../../../common/dto/pagination-meta.dto.js';
import { Booking } from '../../bookings/entities/booking.entity.js';
import { GuideNotFoundException } from '../../guides/exceptions/guides.exceptions.js';
import { GuidesRepository } from '../../guides/repositories/guides.repository.js';
import { SettingsService } from '../../settings/services/settings.service.js';
import { SettingKey } from '../../settings/setting-keys.js';
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
    private readonly settings: SettingsService,
  ) {}

  async createForBooking(
    booking: Booking,
    manager: EntityManager,
  ): Promise<void> {
    const commissionRate = await this.settings.getNumber(
      SettingKey.COMMISSION_RATE,
    );
    const { commissionAmount, netAmount } = splitPayout(
      booking.totalAmount,
      commissionRate,
    );
    await this.payouts.insertIfMissing(
      {
        bookingId: booking.id,
        grossAmount: booking.totalAmount,
        commissionRate,
        commissionAmount,
        penaltyDeduction: 0,
        netAmount,
        status: PayoutStatus.PENDING,
      },
      manager,
    );
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
  ): Promise<PayoutPageDto> {
    const [payouts, total] = await this.payouts.findPage({
      skip: query.skip,
      take: query.limit,
      status: query.status,
      guideProfileId,
    });
    return {
      data: payouts.map((payout) => PayoutDto.fromEntity(payout)),
      meta: PaginationMetaDto.of(query.page, query.limit, total),
    };
  }
}
