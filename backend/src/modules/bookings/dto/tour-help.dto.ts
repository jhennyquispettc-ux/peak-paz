import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { PaginationMetaDto } from '../../../common/dto/pagination-meta.dto.js';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';
import { TourHelpStatus } from '../bookings.enums.js';
import { TourHelpRequest } from '../entities/tour-help-request.entity.js';

export class CreateTourHelpDto {
  @ApiProperty({ example: 'El guía nos está tratando de forma agresiva.' })
  @IsString()
  @Length(10, 1000)
  description: string;
}

export class AttendTourHelpDto {
  @ApiProperty({ example: 'Llamé al guía y a la turista, el tour continúa.' })
  @IsString()
  @Length(5, 1000)
  note: string;
}

export class TourHelpQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: TourHelpStatus })
  @IsOptional()
  @IsEnum(TourHelpStatus)
  status?: TourHelpStatus;
}

export class TourHelpDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  bookingId: string;

  @ApiProperty({ example: 'PP-7K3M9QX2' })
  bookingCode: string;

  @ApiProperty()
  description: string;

  @ApiProperty({ enum: TourHelpStatus })
  status: TourHelpStatus;

  @ApiProperty({ nullable: true })
  adminNote: string | null;

  @ApiProperty({ nullable: true })
  attendedAt: Date | null;

  @ApiProperty()
  createdAt: Date;

  static fromEntity(help: TourHelpRequest): TourHelpDto {
    return {
      id: help.id,
      bookingId: help.bookingId,
      bookingCode: help.booking.code,
      description: help.description,
      status: help.status,
      adminNote: help.adminNote,
      attendedAt: help.attendedAt,
      createdAt: help.createdAt,
    };
  }
}

export class AdminTourHelpDto extends TourHelpDto {
  @ApiProperty({ example: '2026-12-05', nullable: true })
  tourDate: string | null;

  @ApiProperty({ nullable: true })
  routeNameEs: string | null;

  @ApiProperty({ nullable: true })
  touristName: string | null;

  @ApiProperty({ nullable: true })
  touristPhone: string | null;

  @ApiProperty({ nullable: true })
  touristEmail: string | null;

  @ApiProperty({ nullable: true })
  providerName: string | null;

  @ApiProperty({ nullable: true })
  providerPhone: string | null;

  static fromHelp(help: TourHelpRequest): AdminTourHelpDto {
    const booking = help.booking;
    const departure = booking.groupDeparture;
    const guide = booking.guideProfile?.user;
    const tourist = booking.tourist;
    return {
      ...TourHelpDto.fromEntity(help),
      tourDate: booking.tourDate ?? departure?.departureDate ?? null,
      routeNameEs: (booking.route ?? departure?.route)?.nameEs ?? null,
      touristName: tourist ? `${tourist.firstName} ${tourist.lastName}` : null,
      touristPhone: tourist?.phone ?? null,
      touristEmail: tourist?.email ?? null,
      providerName:
        departure?.agency?.legalName ??
        (guide ? `${guide.firstName} ${guide.lastName}` : null),
      providerPhone: guide?.phone ?? departure?.agency?.user?.phone ?? null,
    };
  }
}

export class AdminTourHelpPageDto {
  @ApiProperty({ type: [AdminTourHelpDto] })
  data: AdminTourHelpDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
