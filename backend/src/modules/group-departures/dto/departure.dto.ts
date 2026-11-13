import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { PaginationMetaDto } from '../../../common/dto/pagination-meta.dto.js';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';
import { Difficulty } from '../../routes/routes.enums.js';
import { GroupDeparture } from '../entities/group-departure.entity.js';
import { GroupDepartureStatus } from '../group-departures.enums.js';

export class CreateDepartureDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  routeId: string;

  @ApiProperty({ example: '2026-12-12' })
  @IsISO8601({ strict: true })
  departureDate: string;

  @ApiProperty({
    example: '06:30',
    description: 'Hora de inicio en el sendero',
  })
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'meetingTime must use HH:mm',
  })
  meetingTime: string;

  @ApiProperty({ example: 'Plaza San Francisco, frente a la iglesia' })
  @IsString()
  @Length(5, 200)
  meetingPoint: string;

  @ApiProperty({ example: 380, description: 'En bolivianos' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  pricePerPerson: number;

  @ApiPropertyOptional({
    example: 3,
    description: 'Por defecto la regla GROUP_MIN_PEOPLE',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  minPeople?: number;

  @ApiProperty({ example: 10 })
  @IsInt()
  @Min(1)
  @Max(50)
  maxPeople: number;

  @ApiProperty({ example: 'Juan Mamani' })
  @IsString()
  @Length(3, 120)
  guideName: string;
}

export class DepartureQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 'choro-3-dias' })
  @IsOptional()
  @IsString()
  routeSlug?: string;
}

export class JoinDepartureDto {
  @ApiProperty({ example: 2, minimum: 1 })
  @IsInt()
  @Min(1)
  @Max(20)
  peopleCount: number;
}

export class ManualBookingDto extends JoinDepartureDto {
  @ApiProperty({ example: 'Carlos Pérez, +591 70000000' })
  @IsString()
  @Length(3, 200)
  contact: string;
}

export class DepartureRouteDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  slug: string;

  @ApiProperty()
  nameEs: string;

  @ApiProperty({ enum: Difficulty })
  difficulty: Difficulty;

  @ApiProperty()
  days: number;
}

export class DepartureAgencyDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  legalName: string;

  @ApiProperty()
  ratingAverage: number;
}

export class DepartureDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ type: DepartureRouteDto })
  route: DepartureRouteDto;

  @ApiProperty({ type: DepartureAgencyDto })
  agency: DepartureAgencyDto;

  @ApiProperty({ example: '2026-12-12' })
  departureDate: string;

  @ApiProperty({ example: '06:30' })
  meetingTime: string;

  @ApiProperty()
  meetingPoint: string;

  @ApiProperty()
  guideName: string;

  @ApiProperty({ example: 380 })
  pricePerPerson: number;

  @ApiProperty()
  minPeople: number;

  @ApiProperty()
  maxPeople: number;

  @ApiProperty({ description: 'Personas inscritas con pago hecho o en curso' })
  seatsTaken: number;

  @ApiProperty()
  seatsLeft: number;

  @ApiProperty({ enum: GroupDepartureStatus })
  status: GroupDepartureStatus;

  @ApiProperty({ description: 'Las inscripciones cierran 48 horas antes' })
  closesAt: Date;

  static fromEntity(
    departure: GroupDeparture,
    seatsTaken: number,
  ): DepartureDto {
    return {
      id: departure.id,
      route: {
        id: departure.route.id,
        slug: departure.route.slug,
        nameEs: departure.route.nameEs,
        difficulty: departure.route.difficulty,
        days: departure.route.days,
      },
      agency: {
        id: departure.agency.id,
        legalName: departure.agency.legalName,
        ratingAverage: departure.agency.ratingAverage,
      },
      departureDate: departure.departureDate,
      meetingTime: departure.meetingTime.slice(0, 5),
      meetingPoint: departure.meetingPoint,
      guideName: departure.guideName,
      pricePerPerson: departure.pricePerPerson,
      minPeople: departure.minPeople,
      maxPeople: departure.maxPeople,
      seatsTaken,
      seatsLeft: Math.max(departure.maxPeople - seatsTaken, 0),
      status: departure.status,
      closesAt: departure.closesAt,
    };
  }
}

export class DeparturePageDto {
  @ApiProperty({ type: [DepartureDto] })
  data: DepartureDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}

export class ParticipantDto {
  @ApiProperty({ format: 'uuid' })
  bookingId: string;

  @ApiProperty({ example: 'PP-7K3M9QX2' })
  code: string;

  @ApiProperty({ example: 'WEB' })
  source: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  peopleCount: number;

  @ApiProperty({ example: 'Ana Müller' })
  name: string;

  @ApiProperty({
    nullable: true,
    description: 'Correo y teléfono, visibles solo con la inscripción pagada',
  })
  contact: string | null;
}

export class AgencyDepartureDto extends DepartureDto {
  @ApiProperty({ type: [ParticipantDto] })
  participants: ParticipantDto[];
}
