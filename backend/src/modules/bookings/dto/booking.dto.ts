import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../../common/dto/pagination-meta.dto.js';
import { addDays } from '../../../common/time/la-paz-time.js';
import { Language } from '../../users/users.enums.js';
import { BookingStatus, BookingType } from '../bookings.enums.js';
import { Booking } from '../entities/booking.entity.js';

const CONTACT_VISIBLE_STATUSES = new Set([
  BookingStatus.CONFIRMED,
  BookingStatus.IN_PROGRESS,
  BookingStatus.COMPLETED,
]);

export class BookingRouteDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'choro-3-dias' })
  slug: string;

  @ApiProperty()
  nameEs: string;

  @ApiProperty()
  nameEn: string;

  @ApiProperty()
  days: number;
}

export class BookingGuideDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;
}

export class BookingAgencyDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  legalName: string;
}

export class BookingTouristDto {
  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty({ nullable: true })
  country: string | null;

  @ApiProperty({ enum: Language })
  language: Language;

  @ApiProperty({
    nullable: true,
    description: 'El guía solo lo ve cuando la reserva está pagada',
  })
  email: string | null;

  @ApiProperty({
    nullable: true,
    description: 'El guía solo lo ve cuando la reserva está pagada',
  })
  phone: string | null;
}

export class BookingDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'PP-7K3M9QX2' })
  code: string;

  @ApiProperty({ enum: BookingType })
  type: BookingType;

  @ApiProperty({ enum: BookingStatus })
  status: BookingStatus;

  @ApiProperty({ type: BookingRouteDto })
  route: BookingRouteDto;

  @ApiProperty({
    type: BookingGuideDto,
    nullable: true,
    description: 'Solo en reservas particulares',
  })
  guide: BookingGuideDto | null;

  @ApiProperty({
    type: BookingAgencyDto,
    nullable: true,
    description: 'Solo en salidas grupales',
  })
  agency: BookingAgencyDto | null;

  @ApiProperty({ format: 'uuid', nullable: true })
  groupDepartureId: string | null;

  @ApiProperty({ type: BookingTouristDto, nullable: true })
  tourist: BookingTouristDto | null;

  @ApiProperty({ example: '2026-12-05' })
  tourDate: string;

  @ApiProperty({ example: '2026-12-07' })
  endDate: string;

  @ApiProperty({ example: '07:00' })
  startTime: string;

  @ApiProperty()
  peopleCount: number;

  @ApiProperty({ example: 120 })
  totalAmount: number;

  @ApiProperty({ nullable: true })
  respondBy: Date | null;

  @ApiProperty({ nullable: true })
  payBy: Date | null;

  @ApiProperty({ nullable: true })
  acceptedAt: Date | null;

  @ApiProperty({ nullable: true })
  confirmedAt: Date | null;

  @ApiProperty({ nullable: true })
  cancelledAt: Date | null;

  @ApiProperty({ nullable: true })
  cancellationReason: string | null;

  @ApiProperty()
  createdAt: Date;

  static fromEntity(booking: Booking, hideContact = false): BookingDto {
    const departure = booking.groupDeparture;
    const route = booking.route ?? departure!.route;
    const guideUser = booking.guideProfile?.user;
    const tourist = booking.tourist;
    const showContact =
      !hideContact || CONTACT_VISIBLE_STATUSES.has(booking.status);
    const tourDate = booking.tourDate ?? departure!.departureDate;

    return {
      id: booking.id,
      code: booking.code,
      type: booking.type,
      status: booking.status,
      route: {
        id: route.id,
        slug: route.slug,
        nameEs: route.nameEs,
        nameEn: route.nameEn,
        days: route.days,
      },
      guide: guideUser
        ? {
            id: booking.guideProfileId!,
            firstName: guideUser.firstName,
            lastName: guideUser.lastName,
          }
        : null,
      agency: departure?.agency
        ? { id: departure.agency.id, legalName: departure.agency.legalName }
        : null,
      groupDepartureId: booking.groupDepartureId,
      tourist: tourist
        ? {
            firstName: tourist.firstName,
            lastName: tourist.lastName,
            country: tourist.country,
            language: tourist.language,
            email: showContact ? tourist.email : null,
            phone: showContact ? tourist.phone : null,
          }
        : null,
      tourDate,
      endDate: addDays(tourDate, route.days - 1),
      startTime: (booking.startTime ?? departure!.meetingTime).slice(0, 5),
      peopleCount: booking.peopleCount,
      totalAmount: booking.totalAmount,
      respondBy: booking.respondBy,
      payBy: booking.payBy,
      acceptedAt: booking.acceptedAt,
      confirmedAt: booking.confirmedAt,
      cancelledAt: booking.cancelledAt,
      cancellationReason: booking.cancellationReason,
      createdAt: booking.createdAt,
    };
  }
}

export class BookingPageDto {
  @ApiProperty({ type: [BookingDto] })
  data: BookingDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
