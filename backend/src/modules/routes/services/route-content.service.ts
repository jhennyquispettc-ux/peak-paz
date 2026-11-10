import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CreateGearRecommendationDto } from '../dto/create-gear-recommendation.dto.js';
import { CreatePointOfInterestDto } from '../dto/create-point-of-interest.dto.js';
import { CreateRoutePhotoDto } from '../dto/create-route-photo.dto.js';
import { GearRecommendationDto } from '../dto/gear-recommendation.dto.js';
import { PointOfInterestDto } from '../dto/point-of-interest.dto.js';
import { RoutePhotoDto } from '../dto/route-photo.dto.js';
import { SpeciesDto } from '../dto/species.dto.js';
import { UpdateGearRecommendationDto } from '../dto/update-gear-recommendation.dto.js';
import { UpdatePointOfInterestDto } from '../dto/update-point-of-interest.dto.js';
import { GearRecommendation } from '../entities/gear-recommendation.entity.js';
import { PointOfInterest } from '../entities/point-of-interest.entity.js';
import { RoutePhoto } from '../entities/route-photo.entity.js';
import { Species } from '../entities/species.entity.js';
import {
  GearRecommendationNotFoundException,
  InvalidItineraryStopException,
  PointOfInterestNotFoundException,
  RouteNotFoundException,
  RoutePhotoNotFoundException,
  SpeciesNotFoundException,
} from '../exceptions/routes.exceptions.js';
import { RoutesRepository } from '../repositories/routes.repository.js';

@Injectable()
export class RouteContentService {
  constructor(
    private readonly routes: RoutesRepository,
    @InjectRepository(PointOfInterest)
    private readonly points: Repository<PointOfInterest>,
    @InjectRepository(GearRecommendation)
    private readonly gear: Repository<GearRecommendation>,
    @InjectRepository(RoutePhoto)
    private readonly photos: Repository<RoutePhoto>,
    @InjectRepository(Species)
    private readonly species: Repository<Species>,
  ) {}

  async addPoint(
    routeId: string,
    dto: CreatePointOfInterestDto,
  ): Promise<PointOfInterestDto> {
    await this.assertRouteExists(routeId);
    const point = this.points.create(dto);
    point.routeId = routeId;
    this.assertItineraryFields(point);
    return PointOfInterestDto.fromEntity(await this.points.save(point));
  }

  async updatePoint(
    routeId: string,
    pointId: string,
    dto: UpdatePointOfInterestDto,
  ): Promise<PointOfInterestDto> {
    const point = await this.points.findOne({
      where: { id: pointId, routeId },
    });
    if (!point) throw new PointOfInterestNotFoundException();
    Object.assign(point, dto);
    this.assertItineraryFields(point);
    return PointOfInterestDto.fromEntity(await this.points.save(point));
  }

  async removePoint(routeId: string, pointId: string): Promise<void> {
    const result = await this.points.delete({ id: pointId, routeId });
    if (!result.affected) throw new PointOfInterestNotFoundException();
  }

  async addGear(
    routeId: string,
    dto: CreateGearRecommendationDto,
  ): Promise<GearRecommendationDto> {
    await this.assertRouteExists(routeId);
    const gear = this.gear.create(dto);
    gear.routeId = routeId;
    return GearRecommendationDto.fromEntity(await this.gear.save(gear));
  }

  async updateGear(
    routeId: string,
    gearId: string,
    dto: UpdateGearRecommendationDto,
  ): Promise<GearRecommendationDto> {
    const gear = await this.gear.findOne({ where: { id: gearId, routeId } });
    if (!gear) throw new GearRecommendationNotFoundException();
    Object.assign(gear, dto);
    return GearRecommendationDto.fromEntity(await this.gear.save(gear));
  }

  async removeGear(routeId: string, gearId: string): Promise<void> {
    const result = await this.gear.delete({ id: gearId, routeId });
    if (!result.affected) throw new GearRecommendationNotFoundException();
  }

  async addPhoto(
    routeId: string,
    dto: CreateRoutePhotoDto,
  ): Promise<RoutePhotoDto> {
    await this.assertRouteExists(routeId);
    const photo = this.photos.create(dto);
    photo.routeId = routeId;
    return RoutePhotoDto.fromEntity(await this.photos.save(photo));
  }

  async removePhoto(routeId: string, photoId: string): Promise<void> {
    const result = await this.photos.delete({ id: photoId, routeId });
    if (!result.affected) throw new RoutePhotoNotFoundException();
  }

  async setSpecies(
    routeId: string,
    speciesIds: string[],
  ): Promise<SpeciesDto[]> {
    const route = await this.routes.findWithSpecies(routeId);
    if (!route) throw new RouteNotFoundException();

    const species =
      speciesIds.length > 0
        ? await this.species.findBy({ id: In(speciesIds) })
        : [];
    if (species.length !== speciesIds.length) {
      throw new SpeciesNotFoundException();
    }

    route.species = species;
    await this.routes.save(route);
    return species.map((item) => SpeciesDto.fromEntity(item));
  }

  private async assertRouteExists(routeId: string): Promise<void> {
    if (!(await this.routes.findById(routeId))) {
      throw new RouteNotFoundException();
    }
  }

  private assertItineraryFields(point: PointOfInterest): void {
    const fields = [
      point.stageOrder,
      point.dayNumber,
      point.minutesFromPrevious,
    ];
    const valid = point.isItineraryStop
      ? fields.every((value) => value !== null && value !== undefined)
      : fields.every((value) => value === null || value === undefined);
    if (!valid) throw new InvalidItineraryStopException();
  }
}
