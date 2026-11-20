import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Payout } from '../entities/payout.entity.js';
import { PayoutStatus } from '../payments.enums.js';

export interface PayoutPageFilters {
  skip: number;
  take: number;
  status?: PayoutStatus;
  guideProfileId?: string;
  agencyId?: string;
}

@Injectable()
export class PayoutsRepository {
  constructor(
    @InjectRepository(Payout) private readonly payouts: Repository<Payout>,
  ) {}

  async insertIfMissing(
    data: Partial<Payout>,
    manager: EntityManager,
  ): Promise<void> {
    await manager
      .createQueryBuilder()
      .insert()
      .into(Payout)
      .values(data)
      .orIgnore()
      .execute();
  }

  existsForBooking(
    bookingId: string,
    manager: EntityManager,
  ): Promise<boolean> {
    return manager.getRepository(Payout).exists({ where: { bookingId } });
  }

  findPendingForBookingForUpdate(
    bookingId: string,
    manager: EntityManager,
  ): Promise<Payout | null> {
    return manager
      .getRepository(Payout)
      .createQueryBuilder('payout')
      .where('payout.bookingId = :bookingId', { bookingId })
      .andWhere('payout.status = :pending', { pending: PayoutStatus.PENDING })
      .setLock('pessimistic_write')
      .getOne();
  }

  saveWith(payout: Payout, manager: EntityManager): Promise<Payout> {
    return manager.getRepository(Payout).save(payout);
  }

  findById(id: string): Promise<Payout | null> {
    return this.payouts.findOne({
      where: { id },
      relations: { booking: { route: true, groupDeparture: { route: true } } },
    });
  }

  save(payout: Payout): Promise<Payout> {
    return this.payouts.save(payout);
  }

  findPage(filters: PayoutPageFilters): Promise<[Payout[], number]> {
    const query = this.payouts
      .createQueryBuilder('payout')
      .innerJoinAndSelect('payout.booking', 'booking')
      .leftJoinAndSelect('booking.route', 'route')
      .leftJoinAndSelect('booking.groupDeparture', 'departure')
      .leftJoinAndSelect('departure.route', 'departureRoute')
      .orderBy('payout.createdAt', 'DESC')
      .skip(filters.skip)
      .take(filters.take);

    if (filters.status) {
      query.andWhere('payout.status = :status', { status: filters.status });
    }
    if (filters.guideProfileId) {
      query.andWhere('booking.guideProfileId = :guideProfileId', {
        guideProfileId: filters.guideProfileId,
      });
    }
    if (filters.agencyId) {
      query.andWhere('departure.agencyId = :agencyId', {
        agencyId: filters.agencyId,
      });
    }
    return query.getManyAndCount();
  }
}
