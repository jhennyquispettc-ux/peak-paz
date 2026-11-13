import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { VerificationStatus } from '../../../common/enums/verification-status.enum.js';
import { BookingStatus } from '../../bookings/bookings.enums.js';
import { UserStatus } from '../../users/users.enums.js';
import { GuideProfile } from '../entities/guide-profile.entity.js';

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
    startDate: string;
    endDate: string;
    weekday: number;
    startTime: string;
  };
}

export const BLOCKING_BOOKING_STATUSES = [
  BookingStatus.ACCEPTED,
  BookingStatus.CONFIRMED,
  BookingStatus.IN_PROGRESS,
];

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
          `EXISTS (SELECT 1 FROM guide_availabilities slot
            WHERE slot.guide_profile_id = guide.id
              AND slot.weekday = :weekday
              AND slot.time_from <= :startTime
              AND slot.time_to > :startTime)`,
        )
        .andWhere(
          `NOT EXISTS (SELECT 1 FROM guide_blocked_dates blocked
            WHERE blocked.guide_profile_id = guide.id
              AND blocked.date_from <= :endDate
              AND blocked.date_to >= :startDate)`,
        )
        .andWhere(
          `NOT EXISTS (SELECT 1 FROM bookings booking
            INNER JOIN routes booked_route ON booked_route.id = booking.route_id
            WHERE booking.guide_profile_id = guide.id
              AND booking.status IN (:...blockingStatuses)
              AND booking.tour_date <= :endDate
              AND booking.tour_date + (booked_route.days - 1) >= :startDate)`,
        )
        .setParameters({
          ...filters.slot,
          blockingStatuses: BLOCKING_BOOKING_STATUSES,
        });
    }

    return query.getMany();
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
