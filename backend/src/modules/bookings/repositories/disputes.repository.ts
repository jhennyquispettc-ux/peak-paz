import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { DisputeStatus } from '../bookings.enums.js';
import { Dispute } from '../entities/dispute.entity.js';

export interface DisputePageFilters {
  skip: number;
  take: number;
  status?: DisputeStatus;
}

@Injectable()
export class DisputesRepository {
  constructor(
    @InjectRepository(Dispute) private readonly disputes: Repository<Dispute>,
  ) {}

  create(data: Partial<Dispute>, manager: EntityManager): Promise<Dispute> {
    const repository = manager.getRepository(Dispute);
    return repository.save(repository.create(data));
  }

  save(dispute: Dispute, manager: EntityManager): Promise<Dispute> {
    return manager.getRepository(Dispute).save(dispute);
  }

  existsForBooking(
    bookingId: string,
    manager: EntityManager,
  ): Promise<boolean> {
    return manager.getRepository(Dispute).exists({ where: { bookingId } });
  }

  findById(id: string, manager?: EntityManager): Promise<Dispute | null> {
    return this.query(manager).where('dispute.id = :id', { id }).getOne();
  }

  async lockById(id: string, manager: EntityManager): Promise<void> {
    await manager
      .getRepository(Dispute)
      .createQueryBuilder('dispute')
      .select('dispute.id')
      .where('dispute.id = :id', { id })
      .setLock('pessimistic_write')
      .getOne();
  }

  findPage(filters: DisputePageFilters): Promise<[Dispute[], number]> {
    const query = this.query().skip(filters.skip).take(filters.take);
    if (filters.status) {
      query.andWhere('dispute.status = :status', { status: filters.status });
    }
    return query.getManyAndCount();
  }

  private query(manager?: EntityManager) {
    const repository = manager?.getRepository(Dispute) ?? this.disputes;
    return repository
      .createQueryBuilder('dispute')
      .innerJoinAndSelect('dispute.booking', 'booking')
      .leftJoinAndSelect('booking.route', 'route')
      .leftJoinAndSelect('booking.guideProfile', 'guide')
      .leftJoinAndSelect('guide.user', 'guideUser')
      .leftJoinAndSelect('booking.tourist', 'tourist')
      .orderBy('dispute.createdAt', 'ASC');
  }
}
