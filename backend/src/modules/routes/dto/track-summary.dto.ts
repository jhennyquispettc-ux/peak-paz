import { ApiProperty } from '@nestjs/swagger';

export class TrackSummaryDto {
  @ApiProperty({ example: 2140 })
  points: number;

  @ApiProperty({ example: 57.4 })
  distanceKm: number;

  @ApiProperty({ example: 420 })
  elevationGainM: number;

  @ApiProperty({ example: 3610 })
  elevationLossM: number;

  @ApiProperty({ example: 4860, nullable: true })
  maxAltitudeM: number | null;
}
