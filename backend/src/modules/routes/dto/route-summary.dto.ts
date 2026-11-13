import { ApiProperty } from '@nestjs/swagger';
import { Route } from '../entities/route.entity.js';
import { AutonomyLevel, Difficulty } from '../routes.enums.js';

export class RouteSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'choro-3-dias' })
  slug: string;

  @ApiProperty()
  nameEs: string;

  @ApiProperty()
  nameEn: string;

  @ApiProperty({ enum: Difficulty })
  difficulty: Difficulty;

  @ApiProperty({ enum: AutonomyLevel })
  autonomyLevel: AutonomyLevel;

  @ApiProperty()
  days: number;

  @ApiProperty()
  distanceKm: number;

  @ApiProperty()
  elevationGainM: number;

  @ApiProperty()
  maxAltitudeM: number;

  @ApiProperty()
  privatePrice: number;

  @ApiProperty()
  groupMinPrice: number;

  @ApiProperty({ nullable: true })
  coverPhotoUrl: string | null;

  @ApiProperty({ example: -16.3315 })
  startLatitude: number;

  @ApiProperty({ example: -68.0381 })
  startLongitude: number;

  @ApiProperty()
  isPublished: boolean;

  static fromEntity(route: Route): RouteSummaryDto {
    const cover = [...(route.photos ?? [])].sort(
      (a, b) => a.sortOrder - b.sortOrder,
    )[0];
    return {
      id: route.id,
      slug: route.slug,
      nameEs: route.nameEs,
      nameEn: route.nameEn,
      difficulty: route.difficulty,
      autonomyLevel: route.autonomyLevel,
      days: route.days,
      distanceKm: route.distanceKm,
      elevationGainM: route.elevationGainM,
      maxAltitudeM: route.maxAltitudeM,
      privatePrice: route.privatePrice,
      groupMinPrice: route.groupMinPrice,
      coverPhotoUrl: cover?.url ?? null,
      startLatitude: route.startLatitude,
      startLongitude: route.startLongitude,
      isPublished: route.isPublished,
    };
  }
}
