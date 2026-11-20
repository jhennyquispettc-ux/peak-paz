import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Complaint } from '../entities/complaint.entity.js';
import { providerFilterSql, SanctionedProvider } from '../sanctions.js';
import { ComplaintStatus } from '../strikes.enums.js';

export interface ComplaintPageFilters {
  skip: number;
  take: number;
  status?: ComplaintStatus;
}

@Injectable()
export class ComplaintsRepository {
  constructor(
    @InjectRepository(Complaint)
    private readonly complaints: Repository<Complaint>,
  ) {}

  create(data: Partial<Complaint>, manager: EntityManager): Promise<Complaint> {
    const repository = manager.getRepository(Complaint);
    return repository.save(repository.create(data));
  }

  save(complaint: Complaint, manager: EntityManager): Promise<Complaint> {
    return manager.getRepository(Complaint).save(complaint);
  }

  existsForBooking(
    bookingId: string,
    manager: EntityManager,
  ): Promise<boolean> {
    return manager.getRepository(Complaint).exists({ where: { bookingId } });
  }

  hasOpenForBooking(bookingId: string): Promise<boolean> {
    return this.complaints.exists({
      where: { bookingId, status: ComplaintStatus.OPEN },
    });
  }

  findByBooking(bookingId: string): Promise<Complaint | null> {
    return this.query()
      .where('complaint.bookingId = :bookingId', { bookingId })
      .getOne();
  }

  findById(id: string, manager?: EntityManager): Promise<Complaint | null> {
    return this.query(manager).where('complaint.id = :id', { id }).getOne();
  }

  async lockById(id: string, manager: EntityManager): Promise<void> {
    await manager
      .getRepository(Complaint)
      .createQueryBuilder('complaint')
      .select('complaint.id')
      .where('complaint.id = :id', { id })
      .setLock('pessimistic_write')
      .getOne();
  }

  findPage(filters: ComplaintPageFilters): Promise<[Complaint[], number]> {
    const query = this.query()
      .orderBy('complaint.createdAt', 'ASC')
      .skip(filters.skip)
      .take(filters.take);
    if (filters.status) {
      query.andWhere('complaint.status = :status', { status: filters.status });
    }
    return query.getManyAndCount();
  }

  findUnsettledForUpdate(
    provider: SanctionedProvider,
    manager: EntityManager,
  ): Promise<Complaint[]> {
    return manager
      .getRepository(Complaint)
      .createQueryBuilder('complaint')
      .innerJoin('complaint.booking', 'booking')
      .leftJoin('booking.groupDeparture', 'departure')
      .where(providerFilterSql(provider.kind), { providerId: provider.id })
      .andWhere('complaint.deductionAmount > complaint.deductionSettled')
      .orderBy('complaint.createdAt', 'ASC')
      .setLock('pessimistic_write', undefined, ['complaint'])
      .getMany();
  }

  async sumPending(provider: SanctionedProvider): Promise<number> {
    const row = await this.complaints
      .createQueryBuilder('complaint')
      .innerJoin('complaint.booking', 'booking')
      .leftJoin('booking.groupDeparture', 'departure')
      .select(
        'COALESCE(SUM(complaint.deductionAmount - complaint.deductionSettled), 0)',
        'total',
      )
      .where(providerFilterSql(provider.kind), { providerId: provider.id })
      .getRawOne<{ total: string }>();
    return Number(row?.total ?? 0);
  }

  private query(manager?: EntityManager) {
    const repository = manager?.getRepository(Complaint) ?? this.complaints;
    return repository
      .createQueryBuilder('complaint')
      .innerJoinAndSelect('complaint.booking', 'booking')
      .leftJoinAndSelect('booking.tourist', 'tourist')
      .leftJoinAndSelect('booking.route', 'route')
      .leftJoinAndSelect('booking.guideProfile', 'guide')
      .leftJoinAndSelect('guide.user', 'guideUser')
      .leftJoinAndSelect('booking.groupDeparture', 'departure')
      .leftJoinAndSelect('departure.route', 'departureRoute')
      .leftJoinAndSelect('departure.agency', 'agency');
  }
}
