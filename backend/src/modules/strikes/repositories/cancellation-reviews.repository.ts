import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { CancellationReview } from '../entities/cancellation-review.entity.js';
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
    guideProfileId: string,
    manager: EntityManager,
  ): Promise<CancellationReview[]> {
    return manager
      .getRepository(CancellationReview)
      .createQueryBuilder('review')
      .innerJoin('review.booking', 'booking')
      .where('booking.guideProfileId = :guideProfileId', { guideProfileId })
      .andWhere('review.fineAmount > review.fineSettled')
      .orderBy('review.createdAt', 'ASC')
      .setLock('pessimistic_write', undefined, ['review'])
      .getMany();
  }

  async sumPendingFines(guideProfileId: string): Promise<number> {
    const row = await this.reviews
      .createQueryBuilder('review')
      .innerJoin('review.booking', 'booking')
      .select(
        'COALESCE(SUM(review.fineAmount - review.fineSettled), 0)',
        'total',
      )
      .where('booking.guideProfileId = :guideProfileId', { guideProfileId })
      .getRawOne<{ total: string }>();
    return Number(row?.total ?? 0);
  }

  private query(manager?: EntityManager) {
    const repository =
      manager?.getRepository(CancellationReview) ?? this.reviews;
    return repository
      .createQueryBuilder('review')
      .innerJoinAndSelect('review.booking', 'booking')
      .leftJoinAndSelect('booking.route', 'route')
      .leftJoinAndSelect('booking.guideProfile', 'guide')
      .leftJoinAndSelect('guide.user', 'guideUser')
      .orderBy('review.createdAt', 'ASC');
  }
}
