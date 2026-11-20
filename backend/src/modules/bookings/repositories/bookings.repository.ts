import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { GuideCommitment } from '../../guides/entities/guide-commitment.entity.js';
import {
  BLOCKING_BOOKING_STATUSES,
  bookingEndsSql,
  bookingStartsSql,
} from '../../guides/repositories/guides.repository.js';
import { UserStatus } from '../../users/users.enums.js';
import { BookingStatus, BookingType } from '../bookings.enums.js';
import { Booking } from '../entities/booking.entity.js';

export interface BookingPageFilters {
  skip: number;
  take: number;
  touristId?: string;
  guideProfileId?: string;
  status?: BookingStatus;
  type?: BookingType;
}

export interface BusyWindow {
  busyFrom: Date;
  busyUntil: Date;
}

const OVERLAPS_BUSY = (alias: string) =>
  `${bookingStartsSql(alias)} < :busyUntil AND ${bookingEndsSql(alias)} > :busyFrom`;

@Injectable()
export class BookingsRepository {
  constructor(
    @InjectRepository(Booking) private readonly repository: Repository<Booking>,
  ) {}

  private repo(manager?: EntityManager): Repository<Booking> {
    return manager?.getRepository(Booking) ?? this.repository;
  }

  findDetailById(id: string, manager?: EntityManager): Promise<Booking | null> {
    return this.repo(manager).findOne({
      where: { id },
      relations: {
        route: true,
        guideProfile: { user: true },
        tourist: true,
        groupDeparture: { route: true, agency: true },
      },
    });
  }

  findForUpdate(id: string, manager: EntityManager): Promise<Booking | null> {
    return manager
      .getRepository(Booking)
      .createQueryBuilder('booking')
      .where('booking.id = :id', { id })
      .setLock('pessimistic_write')
      .getOne();
  }

  create(data: Partial<Booking>): Booking {
    return this.repository.create(data);
  }

  save(booking: Booking, manager?: EntityManager): Promise<Booking> {
    return this.repo(manager).save(booking);
  }

  existsOpenRequest(
    touristId: string,
    guideProfileId: string,
    tourDate: string,
  ): Promise<boolean> {
    return this.repository
      .createQueryBuilder('booking')
      .where('booking.touristId = :touristId', { touristId })
      .andWhere('booking.guideProfileId = :guideProfileId', { guideProfileId })
      .andWhere('booking.tourDate = :tourDate', { tourDate })
      .andWhere('booking.status IN (:...statuses)', {
        statuses: [BookingStatus.REQUESTED, BookingStatus.ACCEPTED],
      })
      .getExists();
  }

  async hasConflict(
    guideProfileId: string,
    busy: BusyWindow,
    manager: EntityManager,
  ): Promise<boolean> {
    const bookingClash = await manager
      .getRepository(Booking)
      .createQueryBuilder('booking')
      .where('booking.guide_profile_id = :guideProfileId', { guideProfileId })
      .andWhere('booking.status IN (:...statuses)', {
        statuses: BLOCKING_BOOKING_STATUSES,
      })
      .andWhere(OVERLAPS_BUSY('booking'), busy)
      .getExists();
    if (bookingClash) return true;

    return manager
      .getRepository(GuideCommitment)
      .createQueryBuilder('commitment')
      .where('commitment.guideProfileId = :guideProfileId', { guideProfileId })
      .andWhere('commitment.startsAt < :busyUntil', busy)
      .andWhere('commitment.endsAt > :busyFrom', busy)
      .getExists();
  }

  async rejectOverlappingRequests(
    guideProfileId: string,
    busy: BusyWindow,
    exceptId: string,
    reason: string,
    manager: EntityManager,
  ): Promise<number> {
    const result = await manager
      .createQueryBuilder()
      .update(Booking)
      .set({ status: BookingStatus.REJECTED, cancellationReason: reason })
      .where('guide_profile_id = :guideProfileId', { guideProfileId })
      .andWhere('status = :requested', { requested: BookingStatus.REQUESTED })
      .andWhere('id <> :exceptId', { exceptId })
      .andWhere(OVERLAPS_BUSY('bookings'), busy)
      .execute();
    return result.affected ?? 0;
  }

  findInRange(
    guideProfileId: string,
    from: Date,
    until: Date,
  ): Promise<Booking[]> {
    return this.repository
      .createQueryBuilder('booking')
      .innerJoinAndSelect('booking.route', 'route')
      .where('booking.guideProfileId = :guideProfileId', { guideProfileId })
      .andWhere('booking.status IN (:...statuses)', {
        statuses: [BookingStatus.REQUESTED, ...BLOCKING_BOOKING_STATUSES],
      })
      .andWhere(OVERLAPS_BUSY('booking'), { busyFrom: from, busyUntil: until })
      .orderBy('booking.tourDate', 'ASC')
      .addOrderBy('booking.startTime', 'ASC')
      .getMany();
  }

  findFinishedIds(
    now: Date,
    guideCutoff: Date,
    limit: number,
  ): Promise<string[]> {
    return this.repository
      .createQueryBuilder('booking')
      .select('booking.id', 'id')
      .where('booking.status IN (:...running)', {
        running: [BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS],
      })
      .andWhere(
        `((booking.guide_profile_id IS NULL AND ${bookingEndsSql('booking')} < :now)
          OR (booking.guide_profile_id IS NOT NULL AND ${bookingEndsSql('booking')} < :guideCutoff))`,
        { now, guideCutoff },
      )
      .andWhere(
        'NOT EXISTS (SELECT 1 FROM disputes dispute WHERE dispute.booking_id = booking.id)',
      )
      .orderBy('booking.tourDate', 'ASC')
      .limit(limit)
      .getRawMany<{ id: string }>()
      .then((rows) => rows.map((row) => row.id));
  }

  findOpenOfSuspendedGuidesIds(now: Date, limit: number): Promise<string[]> {
    return this.repository
      .createQueryBuilder('booking')
      .innerJoin('booking.guideProfile', 'guide')
      .innerJoin('guide.user', 'guideUser')
      .select('booking.id', 'id')
      .where('guideUser.status = :suspended', {
        suspended: UserStatus.SUSPENDED,
      })
      .andWhere('booking.status IN (:...open)', {
        open: [
          BookingStatus.REQUESTED,
          BookingStatus.ACCEPTED,
          BookingStatus.CONFIRMED,
        ],
      })
      .andWhere(`${bookingStartsSql('booking')} > :now`, { now })
      .orderBy('booking.tourDate', 'ASC')
      .limit(limit)
      .getRawMany<{ id: string }>()
      .then((rows) => rows.map((row) => row.id));
  }

  async expireOverdue(now: Date): Promise<number> {
    const result = await this.repository
      .createQueryBuilder()
      .update(Booking)
      .set({ status: BookingStatus.EXPIRED })
      .where(
        `(status = :requested AND respond_by < :now)
          OR (status = :accepted AND pay_by < :now)`,
        {
          requested: BookingStatus.REQUESTED,
          accepted: BookingStatus.ACCEPTED,
          now,
        },
      )
      .execute();
    return result.affected ?? 0;
  }

  findPage(filters: BookingPageFilters): Promise<[Booking[], number]> {
    const query = this.repository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.route', 'route')
      .leftJoinAndSelect('booking.guideProfile', 'guide')
      .leftJoinAndSelect('guide.user', 'guideUser')
      .leftJoinAndSelect('booking.tourist', 'tourist')
      .leftJoinAndSelect('booking.groupDeparture', 'departure')
      .leftJoinAndSelect('departure.route', 'departureRoute')
      .leftJoinAndSelect('departure.agency', 'agency')
      .orderBy('booking.tourDate', 'ASC')
      .addOrderBy('booking.createdAt', 'DESC')
      .skip(filters.skip)
      .take(filters.take);

    if (filters.touristId) {
      query.andWhere('booking.touristId = :touristId', {
        touristId: filters.touristId,
      });
    }
    if (filters.guideProfileId) {
      query.andWhere('booking.guideProfileId = :guideProfileId', {
        guideProfileId: filters.guideProfileId,
      });
    }
    if (filters.status) {
      query.andWhere('booking.status = :status', { status: filters.status });
    }
    if (filters.type) {
      query.andWhere('booking.type = :type', { type: filters.type });
    }
    return query.getManyAndCount();
  }
}
