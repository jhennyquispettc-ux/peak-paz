import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601, IsInt, IsUUID, Matches, Max, Min } from 'class-validator';

export class CreateBookingDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  routeId: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  guideProfileId: string;

  @ApiProperty({ example: '2026-12-05' })
  @IsISO8601({ strict: true })
  tourDate: string;

  @ApiProperty({ example: '07:00' })
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'startTime must use HH:mm',
  })
  startTime: string;

  @ApiProperty({ example: 2, minimum: 1 })
  @IsInt()
  @Min(1)
  @Max(50)
  peopleCount: number;
}
