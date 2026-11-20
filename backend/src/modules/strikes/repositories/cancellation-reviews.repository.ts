import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { CancellationReview } from '../entities/cancellation-review.entity.js';
import { providerFilterSql, SanctionedProvider } from '../sanctions.js';
import { CancellationReviewStatus } from '../strikes.enums.js';

export interface CancellationReviewPageFilters {
  skip: number;
  take: number;
  status?: CancellationReviewStatus;
}

@Injectable()
export class CancellationReviewsRepository {
  constructor(
    @InjectRepository(CancellationReview)
    private readonly reviews: Repository<CancellationReview>,
  ) {}

  create(
    data: Partial<CancellationReview>,
    manager: EntityManager,
  ): Promise<CancellationReview> {
    const repository = manager.getRepository(CancellationReview);
    return repository.save(repository.create(data));
  }

  save(
    review: CancellationReview,
    manager: EntityManager,
  ): Promise<CancellationReview> {
    return manager.getRepository(CancellationReview).save(review);
  }

  findById(
    id: string,
    manager?: EntityManager,
  ): Promise<CancellationReview | null> {
    return this.query(manager).where('review.id = :id', { id }).getOne();
  }

  async lockById(id: string, manager: EntityManager): Promise<void> {
    await manager
      .getRepository(CancellationReview)
      .createQueryBuilder('review')
      .select('review.id')
      .where('review.id = :id', { id })
      .setLock('pessimistic_write')
      .getOne();
  }

  findPage(
    filters: CancellationReviewPageFilters,
  ): Promise<[CancellationReview[], number]> {
    const query = this.query().skip(filters.skip).take(filters.take);
    if (filters.status) {
      query.andWhere('review.status = :status', { status: filters.status });
    }
    return query.getManyAndCount();
  }

  findUnsettledFinesForUpdate(
    provider: SanctionedProvider,
    manager: EntityManager,
  ): Promise<CancellationReview[]> {
    return manager
      .getRepository(CancellationReview)
      .createQueryBuilder('review')
      .leftJoin('review.booking', 'booking')
      .leftJoin('review.groupDeparture', 'departure')
      .where(providerFilterSql(provider.kind), { providerId: provider.id })
      .andWhere('review.fineAmount > review.fineSettled')
      .orderBy('review.createdAt', 'ASC')
      .setLock('pessimistic_write', undefined, ['review'])
      .getMany();
  }

  async sumPendingFines(provider: SanctionedProvider): Promise<number> {
    const row = await this.reviews
      .createQueryBuilder('review')
      .leftJoin('review.booking', 'booking')
      .leftJoin('review.groupDeparture', 'departure')
      .select(
        'COALESCE(SUM(review.fineAmount - review.fineSettled), 0)',
        'total',
      )
      .where(providerFilterSql(provider.kind), { providerId: provider.id })
      .getRawOne<{ total: string }>();
    return Number(row?.total ?? 0);
  }

  private query(manager?: EntityManager) {
    const repository =
      manager?.getRepository(CancellationReview) ?? this.reviews;
    return repository
      .createQueryBuilder('review')
      .leftJoinAndSelect('review.booking', 'booking')
      .leftJoinAndSelect('booking.route', 'route')
      .leftJoinAndSelect('booking.guideProfile', 'guide')
      .leftJoinAndSelect('guide.user', 'guideUser')
      .leftJoinAndSelect('review.groupDeparture', 'departure')
      .leftJoinAndSelect('departure.route', 'departureRoute')
      .leftJoinAndSelect('departure.agency', 'agency')
      .orderBy('review.createdAt', 'ASC');
  }
}
