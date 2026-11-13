import { ApiProperty } from '@nestjs/swagger';
import { Route } from '../entities/route.entity.js';
import type { LineString } from '../types/line-string.js';
import { GearRecommendationDto } from './gear-recommendation.dto.js';
import { PointOfInterestDto } from './point-of-interest.dto.js';
import { RoutePhotoDto } from './route-photo.dto.js';
import { RouteSummaryDto } from './route-summary.dto.js';
import { SpeciesDto } from './species.dto.js';

export class RouteDetailDto extends RouteSummaryDto {
  @ApiProperty()
  descriptionEs: string;

  @ApiProperty()
  descriptionEn: string;

  @ApiProperty()
  elevationLossM: number;

  @ApiProperty({ example: '06:00' })
  startTimeFrom: string;

  @ApiProperty({ example: '08:00' })
  startTimeTo: string;

  @ApiProperty()
  howToGetThereEs: string;

  @ApiProperty()
  howToGetThereEn: string;

  @ApiProperty({ nullable: true })
  bestSeasonEs: string | null;

  @ApiProperty({ nullable: true })
  bestSeasonEn: string | null;

  @ApiProperty()
  emergencyContacts: string;

  @ApiProperty()
  privateMaxPeople: number;

  @ApiProperty()
  groupMaxPeople: number;

  @ApiProperty({
    nullable: true,
    description: 'GeoJSON LineString con [longitud, latitud, altitud]',
  })
  track: LineString | null;

  @ApiProperty({ type: [PointOfInterestDto] })
  pointsOfInterest: PointOfInterestDto[];

  @ApiProperty({ type: [GearRecommendationDto] })
  gearRecommendations: GearRecommendationDto[];

  @ApiProperty({ type: [RoutePhotoDto] })
  photos: RoutePhotoDto[];

  @ApiProperty({ type: [SpeciesDto] })
  species: SpeciesDto[];

  static fromEntity(route: Route): RouteDetailDto {
    const points = [...(route.pointsOfInterest ?? [])].sort(
      (a, b) =>
        (a.stageOrder ?? Number.MAX_SAFE_INTEGER) -
          (b.stageOrder ?? Number.MAX_SAFE_INTEGER) ||
        a.nameEs.localeCompare(b.nameEs),
    );
    const photos = [...(route.photos ?? [])].sort(
      (a, b) => a.sortOrder - b.sortOrder,
    );
    return Object.assign(RouteSummaryDto.fromEntity(route), {
      descriptionEs: route.descriptionEs,
      descriptionEn: route.descriptionEn,
      elevationLossM: route.elevationLossM,
      startTimeFrom: route.startTimeFrom.slice(0, 5),
      startTimeTo: route.startTimeTo.slice(0, 5),
      howToGetThereEs: route.howToGetThereEs,
      howToGetThereEn: route.howToGetThereEn,
      bestSeasonEs: route.bestSeasonEs,
      bestSeasonEn: route.bestSeasonEn,
      emergencyContacts: route.emergencyContacts,
      privateMaxPeople: route.privateMaxPeople,
      groupMaxPeople: route.groupMaxPeople,
      track: route.track,
      pointsOfInterest: points.map((point) =>
        PointOfInterestDto.fromEntity(point),
      ),
      gearRecommendations: (route.gearRecommendations ?? []).map((gear) =>
        GearRecommendationDto.fromEntity(gear),
      ),
      photos: photos.map((photo) => RoutePhotoDto.fromEntity(photo)),
      species: (route.species ?? []).map((species) =>
        SpeciesDto.fromEntity(species),
      ),
    });
  }
}
