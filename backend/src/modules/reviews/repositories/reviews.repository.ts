import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import {
  providerFilterSql,
  SanctionedProvider,
} from '../../strikes/sanctions.js';
import { Review } from '../entities/review.entity.js';

export interface ReviewPageFilters {
  skip: number;
  take: number;
  provider?: SanctionedProvider;
  hidden?: boolean;
}

export interface RatingSummary {
  average: number;
  count: number;
}

@Injectable()
export class ReviewsRepository {
  constructor(
    @InjectRepository(Review) private readonly reviews: Repository<Review>,
  ) {}

  create(data: Partial<Review>, manager: EntityManager): Promise<Review> {
    const repository = manager.getRepository(Review);
    return repository.save(repository.create(data));
  }

  save(review: Review, manager: EntityManager): Promise<Review> {
    return manager.getRepository(Review).save(review);
  }

  existsForBooking(
    bookingId: string,
    manager: EntityManager,
  ): Promise<boolean> {
    return manager.getRepository(Review).exists({ where: { bookingId } });
  }

  findByBooking(bookingId: string): Promise<Review | null> {
    return this.query()
      .where('review.bookingId = :bookingId', { bookingId })
      .getOne();
  }

  findById(id: string, manager?: EntityManager): Promise<Review | null> {
    return this.query(manager).where('review.id = :id', { id }).getOne();
  }

  async lockById(id: string, manager: EntityManager): Promise<void> {
    await manager
      .getRepository(Review)
      .createQueryBuilder('review')
      .select('review.id')
      .where('review.id = :id', { id })
      .setLock('pessimistic_write')
      .getOne();
  }

  async ratingFor(
    provider: SanctionedProvider,
    manager: EntityManager,
  ): Promise<RatingSummary> {
    const row = await manager
      .getRepository(Review)
      .createQueryBuilder('review')
      .innerJoin('review.booking', 'booking')
      .leftJoin('booking.groupDeparture', 'departure')
      .select('COALESCE(AVG(review.rating), 0)', 'average')
      .addSelect('COUNT(review.id)', 'count')
      .where(providerFilterSql(provider.kind), { providerId: provider.id })
      .andWhere('review.hiddenAt IS NULL')
      .getRawOne<{ average: string; count: string }>();
    return {
      average: Number(row?.average ?? 0),
      count: Number(row?.count ?? 0),
    };
  }

  findPage(filters: ReviewPageFilters): Promise<[Review[], number]> {
    const query = this.query()
      .orderBy('review.createdAt', 'DESC')
      .skip(filters.skip)
      .take(filters.take);
    if (filters.provider) {
      query.andWhere(providerFilterSql(filters.provider.kind), {
        providerId: filters.provider.id,
      });
    }
    if (filters.hidden !== undefined) {
      query.andWhere(
        filters.hidden
          ? 'review.hiddenAt IS NOT NULL'
          : 'review.hiddenAt IS NULL',
      );
    }
    return query.getManyAndCount();
  }

  private query(manager?: EntityManager) {
    const repository = manager?.getRepository(Review) ?? this.reviews;
    return repository
      .createQueryBuilder('review')
      .innerJoinAndSelect('review.booking', 'booking')
      .leftJoinAndSelect('booking.tourist', 'tourist')
      .leftJoinAndSelect('booking.route', 'route')
      .leftJoinAndSelect('booking.guideProfile', 'guide')
      .leftJoinAndSelect('guide.user', 'guideUser')
      .leftJoinAndSelect('booking.groupDeparture', 'departure')
      .leftJoinAndSelect('departure.route', 'departureRoute')
      .leftJoinAndSelect('departure.agency', 'agency');
  }
}
