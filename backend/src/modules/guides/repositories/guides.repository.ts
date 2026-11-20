import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { VerificationStatus } from '../../../common/enums/verification-status.enum.js';
import { BookingStatus } from '../../bookings/bookings.enums.js';
import { UserStatus } from '../../users/users.enums.js';
import { GuideProfile } from '../entities/guide-profile.entity.js';
import { AvailabilityMode } from '../guides.enums.js';

export interface GuidePageFilters {
  skip: number;
  take: number;
  status?: VerificationStatus;
  search?: string;
}

export interface GuideAvailabilityFilters {
  routeId: string;
  guideProfileId?: string;
  slot?: {
    date: string;
    weekday: number;
    startTime: string;
    busyFrom: Date;
    busyUntil: Date;
  };
}

export const BLOCKING_BOOKING_STATUSES = [
  BookingStatus.ACCEPTED,
  BookingStatus.CONFIRMED,
  BookingStatus.IN_PROGRESS,
];

export const VISIBLE_GUIDE_SQL =
  '(guide.hidden_until IS NULL OR guide.hidden_until <= now())';

export function bookingStartsSql(alias: string): string {
  return `((${alias}.tour_date + ${alias}.start_time) AT TIME ZONE 'America/La_Paz')`;
}

export function bookingEndsSql(alias: string): string {
  return `COALESCE(${alias}.ends_at, ((${alias}.tour_date + 1)::timestamp AT TIME ZONE 'America/La_Paz'))`;
}

export function busyWindow(
  interval: { startsAt: Date; endsAt: Date },
  bufferMinutes: number,
): { busyFrom: Date; busyUntil: Date } {
  return {
    busyFrom: new Date(interval.startsAt.getTime() - bufferMinutes * 60_000),
    busyUntil: new Date(interval.endsAt.getTime() + bufferMinutes * 60_000),
  };
}

const PROFILE_RELATIONS = {
  user: true,
  documents: true,
  routes: { route: true },
};

@Injectable()
export class GuidesRepository {
  constructor(
    @InjectRepository(GuideProfile)
    private readonly repository: Repository<GuideProfile>,
  ) {}

  findById(id: string): Promise<GuideProfile | null> {
    return this.repository.findOne({
      where: { id },
      relations: PROFILE_RELATIONS,
    });
  }

  findByUserId(userId: string): Promise<GuideProfile | null> {
    return this.repository.findOne({
      where: { userId },
      relations: PROFILE_RELATIONS,
    });
  }

  findPublicById(id: string): Promise<GuideProfile | null> {
    return this.repository
      .createQueryBuilder('guide')
      .innerJoinAndSelect('guide.user', 'user')
      .leftJoinAndSelect('guide.routes', 'guideRoute')
      .leftJoinAndSelect('guideRoute.route', 'route')
      .where('guide.id = :id', { id })
      .andWhere('guide.verificationStatus = :approved', {
        approved: VerificationStatus.APPROVED,
      })
      .andWhere('user.status = :active', { active: UserStatus.ACTIVE })
      .andWhere(VISIBLE_GUIDE_SQL)
      .getOne();
  }

  findAvailableForRoute(
    filters: GuideAvailabilityFilters,
    manager?: EntityManager,
  ): Promise<GuideProfile[]> {
    const repository = manager?.getRepository(GuideProfile) ?? this.repository;
    const query = repository
      .createQueryBuilder('guide')
      .innerJoinAndSelect('guide.user', 'user')
      .innerJoin(
        'guide.routes',
        'guideRoute',
        'guideRoute.routeId = :routeId AND guideRoute.status = :routeApproved',
      )
      .where('guide.verificationStatus = :guideApproved')
      .andWhere('user.status = :active')
      .andWhere(VISIBLE_GUIDE_SQL)
      .setParameters({
        routeId: filters.routeId,
        guideApproved: VerificationStatus.APPROVED,
        routeApproved: VerificationStatus.APPROVED,
        active: UserStatus.ACTIVE,
      })
      .orderBy('guide.ratingAverage', 'DESC')
      .addOrderBy('guide.reviewsCount', 'DESC');

    if (filters.guideProfileId) {
      query.andWhere('guide.id = :guideProfileId', {
        guideProfileId: filters.guideProfileId,
      });
    }

    if (filters.slot) {
      query
        .andWhere(
          `((guide.availability_mode = :weeklyMode AND EXISTS (
              SELECT 1 FROM guide_availabilities slot
              WHERE slot.guide_profile_id = guide.id
                AND slot.weekday = :weekday
                AND slot.time_from <= :startTime
                AND slot.time_to > :startTime))
            OR (guide.availability_mode = :byDateMode AND EXISTS (
              SELECT 1 FROM guide_available_dates available
              WHERE available.guide_profile_id = guide.id
                AND available.date = :date
                AND available.time_from <= :startTime
                AND available.time_to > :startTime)))`,
        )
        .andWhere(
          `NOT EXISTS (SELECT 1 FROM guide_commitments commitment
            WHERE commitment.guide_profile_id = guide.id
              AND commitment.starts_at < :busyUntil
              AND commitment.ends_at > :busyFrom)`,
        )
        .andWhere(
          `NOT EXISTS (SELECT 1 FROM bookings booking
            WHERE booking.guide_profile_id = guide.id
              AND booking.status IN (:...blockingStatuses)
              AND ${bookingStartsSql('booking')} < :busyUntil
              AND ${bookingEndsSql('booking')} > :busyFrom)`,
        )
        .setParameters({
          date: filters.slot.date,
          weekday: filters.slot.weekday,
          startTime: filters.slot.startTime,
          busyFrom: filters.slot.busyFrom,
          busyUntil: filters.slot.busyUntil,
          weeklyMode: AvailabilityMode.WEEKLY,
          byDateMode: AvailabilityMode.BY_DATE,
          blockingStatuses: BLOCKING_BOOKING_STATUSES,
        });
    }

    return query.getMany();
  }

  async hasBlockingBooking(
    guideProfileId: string,
    busyFrom: Date,
    busyUntil: Date,
  ): Promise<boolean> {
    const rows: unknown[] = await this.repository.manager
      .createQueryBuilder()
      .select('1')
      .from('bookings', 'booking')
      .where('booking.guide_profile_id = :guideProfileId', { guideProfileId })
      .andWhere('booking.status IN (:...statuses)', {
        statuses: BLOCKING_BOOKING_STATUSES,
      })
      .andWhere(`${bookingStartsSql('booking')} < :busyUntil`, { busyUntil })
      .andWhere(`${bookingEndsSql('booking')} > :busyFrom`, { busyFrom })
      .limit(1)
      .getRawMany();
    return rows.length > 0;
  }

  async lockById(id: string, manager: EntityManager): Promise<void> {
    await manager
      .getRepository(GuideProfile)
      .createQueryBuilder('guide')
      .select('guide.id')
      .where('guide.id = :id', { id })
      .setLock('pessimistic_write')
      .getOne();
  }

  findIdByUserId(userId: string): Promise<GuideProfile | null> {
    return this.repository.findOne({ where: { userId } });
  }

  findPlainById(
    id: string,
    manager?: EntityManager,
  ): Promise<GuideProfile | null> {
    const repository = manager?.getRepository(GuideProfile) ?? this.repository;
    return repository.findOne({ where: { id } });
  }

  async hideUntil(
    id: string,
    until: Date,
    manager: EntityManager,
  ): Promise<void> {
    await manager
      .getRepository(GuideProfile)
      .update({ id }, { hiddenUntil: until });
  }

  create(data: Partial<GuideProfile>, manager?: EntityManager): GuideProfile {
    return (manager?.getRepository(GuideProfile) ?? this.repository).create(
      data,
    );
  }

  save(profile: GuideProfile, manager?: EntityManager): Promise<GuideProfile> {
    return (manager?.getRepository(GuideProfile) ?? this.repository).save(
      profile,
    );
  }

  findPage(filters: GuidePageFilters): Promise<[GuideProfile[], number]> {
    const query = this.repository
      .createQueryBuilder('guide')
      .innerJoinAndSelect('guide.user', 'user')
      .leftJoinAndSelect('guide.documents', 'document')
      .orderBy('guide.createdAt', 'ASC')
      .skip(filters.skip)
      .take(filters.take);

    if (filters.status) {
      query.andWhere('guide.verificationStatus = :status', {
        status: filters.status,
      });
    }
    if (filters.search) {
      query.andWhere(
        '(user.email ILIKE :search OR user.firstName ILIKE :search OR user.lastName ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    return query.getManyAndCount();
  }
}
