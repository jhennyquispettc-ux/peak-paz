import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { VerificationStatus } from '../../../common/enums/verification-status.enum.js';
import { ProviderNotApprovedException } from '../../../common/exceptions/verification.exceptions.js';
import { missingDocumentTypes } from '../../../common/verification/verification-documents.js';
import { REQUIRED_AGENCY_DOCUMENTS } from '../../agencies/agencies.enums.js';
import { addMinutes, laPazInstant } from '../../../common/time/la-paz-time.js';
import { AgencyNotFoundException } from '../../agencies/exceptions/agencies.exceptions.js';
import { AgenciesRepository } from '../../agencies/repositories/agencies.repository.js';
import {
  BookingSource,
  BookingStatus,
  BookingType,
} from '../../bookings/bookings.enums.js';
import { BookingsRepository } from '../../bookings/repositories/bookings.repository.js';
import { generateBookingCode } from '../../bookings/services/booking-code.js';
import { Route } from '../../routes/entities/route.entity.js';
import {
  RouteNotFoundException,
  StartTimeOutsideWindowException,
} from '../../routes/exceptions/routes.exceptions.js';
import { RoutesRepository } from '../../routes/repositories/routes.repository.js';
import { toMinutes } from '../../routes/services/itinerary.service.js';
import { TourIntervalService } from '../../routes/services/tour-interval.service.js';
import { SettingsService } from '../../settings/services/settings.service.js';
import { SettingKey } from '../../settings/setting-keys.js';
import {
  AgencyDepartureDto,
  CreateDepartureDto,
  DepartureDto,
  ManualBookingDto,
} from '../dto/departure.dto.js';
import { GroupDeparture } from '../entities/group-departure.entity.js';
import {
  DepartureClosedException,
  DepartureNotFoundException,
  DepartureTooSoonException,
  InvalidGroupSizeException,
  NotEnoughSeatsException,
  PriceBelowMinimumException,
  AgencyDocumentsExpiredException,
} from '../exceptions/group-departures.exceptions.js';
import { GroupDepartureStatus } from '../group-departures.enums.js';
import { GroupDeparturesRepository } from '../repositories/group-departures.repository.js';
import { toAgencyDepartureDto } from './participants.js';

@Injectable()
export class AgencyDeparturesService {
  constructor(
    private readonly departures: GroupDeparturesRepository,
    private readonly agencies: AgenciesRepository,
    private readonly routes: RoutesRepository,
    private readonly bookings: BookingsRepository,
    private readonly tourIntervals: TourIntervalService,
    private readonly settings: SettingsService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async create(userId: string, dto: CreateDepartureDto): Promise<DepartureDto> {
    const agencyId = await this.approvedAgencyId(userId);
    const route = await this.routes.findById(dto.routeId);
    if (!route?.isPublished) throw new RouteNotFoundException();

    this.assertWindow(route, dto.meetingTime);
    if (dto.pricePerPerson < route.groupMinPrice) {
      throw new PriceBelowMinimumException(route.groupMinPrice);
    }

    const platformMin = await this.settings.getNumber(
      SettingKey.GROUP_MIN_PEOPLE,
    );
    const minPeople = dto.minPeople ?? platformMin;
    if (minPeople < platformMin) {
      throw new InvalidGroupSizeException(
        `A departure needs at least ${platformMin} people to happen.`,
      );
    }
    if (dto.maxPeople < minPeople || dto.maxPeople > route.groupMaxPeople) {
      throw new InvalidGroupSizeException(
        `The maximum must be between ${minPeople} and ${route.groupMaxPeople} people.`,
      );
    }

    const closeHours = await this.settings.getNumber(
      SettingKey.GROUP_CLOSE_HOURS,
    );
    const closesAt = addMinutes(
      laPazInstant(dto.departureDate, dto.meetingTime),
      -closeHours * 60,
    );
    if (closesAt <= new Date()) throw new DepartureTooSoonException(closeHours);

    const saved = await this.departures.save(
      this.departures.create({
        agencyId,
        routeId: route.id,
        departureDate: dto.departureDate,
        meetingTime: dto.meetingTime,
        meetingPoint: dto.meetingPoint,
        pricePerPerson: dto.pricePerPerson,
        minPeople,
        maxPeople: dto.maxPeople,
        guideName: dto.guideName,
        status: GroupDepartureStatus.PUBLISHED,
        closesAt,
      }),
    );
    const departure = await this.departures.findById(saved.id);
    return DepartureDto.fromEntity(departure!, 0);
  }

  async listMine(userId: string): Promise<DepartureDto[]> {
    const agencyId = await this.agencyId(userId);
    const departures = await this.departures.findByAgency(agencyId);
    const seats = await this.departures.seatsTaken(departures.map((d) => d.id));
    return departures.map((departure) =>
      DepartureDto.fromEntity(departure, seats.get(departure.id) ?? 0),
    );
  }

  async getMine(userId: string, id: string): Promise<AgencyDepartureDto> {
    const departure = await this.findMine(userId, id);
    return toAgencyDepartureDto(
      departure,
      await this.departures.findBookings(departure.id),
    );
  }

  async addManualBooking(
    userId: string,
    id: string,
    dto: ManualBookingDto,
  ): Promise<AgencyDepartureDto> {
    const agencyId = await this.agencyId(userId);

    await this.dataSource.transaction(async (manager) => {
      const departure = await this.departures.lockById(id, manager);
      if (!departure || departure.agencyId !== agencyId) {
        throw new DepartureNotFoundException();
      }
      await this.assertOpenWithSeats(departure, dto.peopleCount, manager);

      const now = new Date();
      const interval = await this.tourIntervals.forTour(
        departure.route,
        departure.departureDate,
        departure.meetingTime,
      );
      await this.bookings.save(
        this.bookings.create({
          code: generateBookingCode(),
          type: BookingType.GROUP,
          source: BookingSource.MANUAL,
          touristId: null,
          manualContact: dto.contact,
          groupDepartureId: departure.id,
          peopleCount: dto.peopleCount,
          totalAmount: departure.pricePerPerson * dto.peopleCount,
          endsAt: interval.endsAt,
          status: BookingStatus.CONFIRMED,
          acceptedAt: now,
          confirmedAt: now,
        }),
        manager,
      );
    });
    return this.getMine(userId, id);
  }

  async assertOpenWithSeats(
    departure: GroupDeparture,
    people: number,
    manager: Parameters<GroupDeparturesRepository['seatsTaken']>[1],
  ): Promise<void> {
    if (
      departure.status !== GroupDepartureStatus.PUBLISHED ||
      departure.closesAt <= new Date()
    ) {
      throw new DepartureClosedException();
    }
    const taken =
      (await this.departures.seatsTaken([departure.id], manager)).get(
        departure.id,
      ) ?? 0;
    const left = departure.maxPeople - taken;
    if (people > left) throw new NotEnoughSeatsException(Math.max(left, 0));
  }

  async findMine(userId: string, id: string): Promise<GroupDeparture> {
    const agencyId = await this.agencyId(userId);
    const departure = await this.departures.findById(id);
    if (!departure || departure.agencyId !== agencyId) {
      throw new DepartureNotFoundException();
    }
    return departure;
  }

  private assertWindow(route: Route, time: string): void {
    const from = route.startTimeFrom.slice(0, 5);
    const to = route.startTimeTo.slice(0, 5);
    const minutes = toMinutes(time);
    if (minutes < toMinutes(from) || minutes > toMinutes(to)) {
      throw new StartTimeOutsideWindowException(from, to);
    }
  }

  private async agencyId(userId: string): Promise<string> {
    const agency = await this.agencies.findIdByUserId(userId);
    if (!agency) throw new AgencyNotFoundException();
    return agency.id;
  }

  private async approvedAgencyId(userId: string): Promise<string> {
    const agency = await this.agencies.findByUserId(userId);
    if (!agency) throw new AgencyNotFoundException();
    if (agency.verificationStatus !== VerificationStatus.APPROVED) {
      throw new ProviderNotApprovedException();
    }
    if (
      missingDocumentTypes(REQUIRED_AGENCY_DOCUMENTS, agency.documents ?? [])
        .length > 0
    ) {
      throw new AgencyDocumentsExpiredException();
    }
    return agency.id;
  }
}
