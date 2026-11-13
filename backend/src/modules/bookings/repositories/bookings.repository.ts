import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { BLOCKING_BOOKING_STATUSES } from '../../guides/repositories/guides.repository.js';
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

export interface DateSpan {
  startDate: string;
  endDate: string;
}

const OVERLAPS_SPAN = `booking.tour_date <= :endDate
  AND booking.tour_date + ((SELECT days FROM routes WHERE routes.id = booking.route_id) - 1) >= :startDate`;

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
      relations: { route: true, guideProfile: { user: true }, tourist: true },
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

  hasConflict(
    guideProfileId: string,
    span: DateSpan,
    manager: EntityManager,
  ): Promise<boolean> {
    return manager
      .getRepository(Booking)
      .createQueryBuilder('booking')
      .where('booking.guide_profile_id = :guideProfileId', { guideProfileId })
      .andWhere('booking.status IN (:...statuses)', {
        statuses: BLOCKING_BOOKING_STATUSES,
      })
      .andWhere(OVERLAPS_SPAN, span)
      .getExists();
  }

  async rejectOverlappingRequests(
    guideProfileId: string,
    span: DateSpan,
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
      .andWhere(OVERLAPS_SPAN.replaceAll('booking.', 'bookings.'), span)
      .execute();
    return result.affected ?? 0;
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
