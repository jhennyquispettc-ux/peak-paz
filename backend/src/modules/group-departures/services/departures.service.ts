import { GroupDeparture } from '../entities/group-departure.entity.js';
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PaginationMetaDto } from '../../../common/dto/pagination-meta.dto.js';
import { addMinutes } from '../../../common/time/la-paz-time.js';
import {
  BookingSource,
  BookingStatus,
  BookingType,
} from '../../bookings/bookings.enums.js';
import { BookingDto } from '../../bookings/dto/booking.dto.js';
import { Booking } from '../../bookings/entities/booking.entity.js';
import { BookingsRepository } from '../../bookings/repositories/bookings.repository.js';
import { generateBookingCode } from '../../bookings/services/booking-code.js';
import { TourIntervalService } from '../../routes/services/tour-interval.service.js';
import { SettingsService } from '../../settings/services/settings.service.js';
import { SettingKey } from '../../settings/setting-keys.js';
import {
  DepartureDto,
  DeparturePageDto,
  DepartureQueryDto,
} from '../dto/departure.dto.js';
import {
  AlreadyJoinedException,
  DepartureNotFoundException,
} from '../exceptions/group-departures.exceptions.js';
import {
  GroupDeparturesRepository,
  SEAT_HOLDING_STATUSES,
} from '../repositories/group-departures.repository.js';
import { AgencyDeparturesService } from './agency-departures.service.js';

function isHidden(departure: GroupDeparture, now: Date): boolean {
  const until = departure.agency?.hiddenUntil;
  return until !== null && until !== undefined && until > now;
}

@Injectable()
export class DeparturesService {
  constructor(
    private readonly departures: GroupDeparturesRepository,
    private readonly agencyDepartures: AgencyDeparturesService,
    private readonly bookings: BookingsRepository,
    private readonly tourIntervals: TourIntervalService,
    private readonly settings: SettingsService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async listOpen(query: DepartureQueryDto): Promise<DeparturePageDto> {
    const [departures, total] = await this.departures.findOpenPage({
      skip: query.skip,
      take: query.limit,
      routeSlug: query.routeSlug,
      now: new Date(),
    });
    const seats = await this.departures.seatsTaken(departures.map((d) => d.id));
    return {
      data: departures.map((departure) =>
        DepartureDto.fromEntity(departure, seats.get(departure.id) ?? 0),
      ),
      meta: PaginationMetaDto.of(query.page, query.limit, total),
    };
  }

  async getById(id: string): Promise<DepartureDto> {
    const departure = await this.departures.findById(id);
    if (!departure || isHidden(departure, new Date())) {
      throw new DepartureNotFoundException();
    }
    const seats = await this.departures.seatsTaken([id]);
    return DepartureDto.fromEntity(departure, seats.get(id) ?? 0);
  }

  async join(
    touristId: string,
    id: string,
    peopleCount: number,
  ): Promise<BookingDto> {
    const paymentMinutes = await this.settings.getNumber(
      SettingKey.PAYMENT_WINDOW_MIN,
    );

    const bookingId = await this.dataSource.transaction(async (manager) => {
      const departure = await this.departures.lockById(id, manager);
      if (!departure || isHidden(departure, new Date())) {
        throw new DepartureNotFoundException();
      }

      const open = await manager.getRepository(Booking).exists({
        where: SEAT_HOLDING_STATUSES.map((status) => ({
          groupDepartureId: id,
          touristId,
          status,
        })),
      });
      if (open) throw new AlreadyJoinedException();
      await this.agencyDepartures.assertOpenWithSeats(
        departure,
        peopleCount,
        manager,
      );

      const now = new Date();
      const interval = await this.tourIntervals.forTour(
        departure.route,
        departure.departureDate,
        departure.meetingTime,
      );
      const saved = await this.bookings.save(
        this.bookings.create({
          code: generateBookingCode(),
          type: BookingType.GROUP,
          source: BookingSource.WEB,
          touristId,
          groupDepartureId: departure.id,
          peopleCount,
          totalAmount: departure.pricePerPerson * peopleCount,
          endsAt: interval.endsAt,
          status: BookingStatus.ACCEPTED,
          acceptedAt: now,
          payBy: addMinutes(now, paymentMinutes),
        }),
        manager,
      );
      return saved.id;
    });

    const booking = await this.bookings.findDetailById(bookingId);
    return BookingDto.fromEntity(booking!);
  }
}
