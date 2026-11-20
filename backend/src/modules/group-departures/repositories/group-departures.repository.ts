import { UserStatus } from '../../users/users.enums.js';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { BookingStatus } from '../../bookings/bookings.enums.js';
import { Booking } from '../../bookings/entities/booking.entity.js';
import { GroupDeparture } from '../entities/group-departure.entity.js';
import { GroupDepartureStatus } from '../group-departures.enums.js';

export const SEAT_HOLDING_STATUSES = [
  BookingStatus.ACCEPTED,
  BookingStatus.CONFIRMED,
];

const RELATIONS = { route: true, agency: true };

@Injectable()
export class GroupDeparturesRepository {
  constructor(
    @InjectRepository(GroupDeparture)
    private readonly repository: Repository<GroupDeparture>,
  ) {}

  private repo(manager?: EntityManager): Repository<GroupDeparture> {
    return manager?.getRepository(GroupDeparture) ?? this.repository;
  }

  create(data: Partial<GroupDeparture>): GroupDeparture {
    return this.repository.create(data);
  }

  save(
    departure: GroupDeparture,
    manager?: EntityManager,
  ): Promise<GroupDeparture> {
    return this.repo(manager).save(departure);
  }

  findById(
    id: string,
    manager?: EntityManager,
  ): Promise<GroupDeparture | null> {
    return this.repo(manager).findOne({ where: { id }, relations: RELATIONS });
  }

  async lockById(
    id: string,
    manager: EntityManager,
  ): Promise<GroupDeparture | null> {
    await manager
      .getRepository(GroupDeparture)
      .createQueryBuilder('departure')
      .where('departure.id = :id', { id })
      .setLock('pessimistic_write')
      .getOne();
    return this.findById(id, manager);
  }

  findOpenPage(filters: {
    skip: number;
    take: number;
    routeSlug?: string;
    now: Date;
  }): Promise<[GroupDeparture[], number]> {
    const query = this.repository
      .createQueryBuilder('departure')
      .innerJoinAndSelect('departure.route', 'route')
      .innerJoinAndSelect('departure.agency', 'agency')
      .where('departure.status = :published', {
        published: GroupDepartureStatus.PUBLISHED,
      })
      .andWhere('departure.closesAt > :now', { now: filters.now })
      .andWhere('route.isPublished = true')
      .andWhere('(agency.hiddenUntil IS NULL OR agency.hiddenUntil <= :now)', {
        now: filters.now,
      })
      .orderBy('departure.departureDate', 'ASC')
      .addOrderBy('departure.meetingTime', 'ASC')
      .skip(filters.skip)
      .take(filters.take);
    if (filters.routeSlug) {
      query.andWhere('route.slug = :slug', { slug: filters.routeSlug });
    }
    return query.getManyAndCount();
  }

  findOpenOfSuspendedAgencies(now: Date): Promise<GroupDeparture[]> {
    return this.repository
      .createQueryBuilder('departure')
      .innerJoin('departure.agency', 'agency')
      .innerJoin('agency.user', 'agencyUser')
      .where('agencyUser.status = :suspended', {
        suspended: UserStatus.SUSPENDED,
      })
      .andWhere('departure.status IN (:...open)', {
        open: [GroupDepartureStatus.PUBLISHED, GroupDepartureStatus.CONFIRMED],
      })
      .andWhere(
        "((departure.departure_date + departure.meeting_time) AT TIME ZONE 'America/La_Paz') > :now",
        { now },
      )
      .getMany();
  }

  findByAgency(agencyId: string): Promise<GroupDeparture[]> {
    return this.repository.find({
      where: { agencyId },
      relations: RELATIONS,
      order: { departureDate: 'DESC' },
    });
  }

  findDueToClose(now: Date): Promise<GroupDeparture[]> {
    return this.repository
      .createQueryBuilder('departure')
      .select(['departure.id'])
      .where('departure.status = :published', {
        published: GroupDepartureStatus.PUBLISHED,
      })
      .andWhere('departure.closesAt <= :now', { now })
      .getMany();
  }

  async completeFinished(today: string): Promise<number> {
    const result = await this.repository
      .createQueryBuilder()
      .update(GroupDeparture)
      .set({ status: GroupDepartureStatus.COMPLETED })
      .where('status = :confirmed', {
        confirmed: GroupDepartureStatus.CONFIRMED,
      })
      .andWhere(
        'departure_date + (SELECT days FROM routes WHERE routes.id = group_departures.route_id) <= :today',
        { today },
      )
      .execute();
    return result.affected ?? 0;
  }

  async seatsTaken(
    departureIds: string[],
    manager?: EntityManager,
  ): Promise<Map<string, number>> {
    const seats = new Map(departureIds.map((id) => [id, 0]));
    if (departureIds.length === 0) return seats;
    const rows = await (manager ?? this.repository.manager)
      .getRepository(Booking)
      .createQueryBuilder('booking')
      .select('booking.groupDepartureId', 'id')
      .addSelect('COALESCE(SUM(booking.peopleCount), 0)', 'seats')
      .where('booking.groupDepartureId IN (:...ids)', { ids: departureIds })
      .andWhere('booking.status IN (:...statuses)', {
        statuses: SEAT_HOLDING_STATUSES,
      })
      .groupBy('booking.groupDepartureId')
      .getRawMany<{ id: string; seats: string }>();
    for (const row of rows) seats.set(row.id, Number(row.seats));
    return seats;
  }

  findBookings(
    departureId: string,
    manager?: EntityManager,
  ): Promise<Booking[]> {
    return (manager ?? this.repository.manager).getRepository(Booking).find({
      where: { groupDepartureId: departureId },
      relations: { tourist: true },
      order: { createdAt: 'ASC' },
    });
  }
}
