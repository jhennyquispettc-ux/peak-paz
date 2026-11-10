import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginationMetaDto } from '../../../common/dto/pagination-meta.dto.js';
import { AdminRouteQueryDto } from '../dto/admin-route-query.dto.js';
import { CreateRouteDto } from '../dto/create-route.dto.js';
import { ItineraryDto } from '../dto/itinerary.dto.js';
import { RouteDetailDto } from '../dto/route-detail.dto.js';
import { RoutePageDto } from '../dto/route-page.dto.js';
import { RouteQueryDto } from '../dto/route-query.dto.js';
import { RouteSummaryDto } from '../dto/route-summary.dto.js';
import { TrackSummaryDto } from '../dto/track-summary.dto.js';
import { UpdateRouteDto } from '../dto/update-route.dto.js';
import { WeatherForecastDto } from '../dto/weather.dto.js';
import { PointOfInterest } from '../entities/point-of-interest.entity.js';
import { Route } from '../entities/route.entity.js';
import {
  GpxFileRequiredException,
  InvalidStartWindowException,
  RouteNotFoundException,
  RouteNotReadyException,
} from '../exceptions/routes.exceptions.js';
import { RoutesRepository } from '../repositories/routes.repository.js';
import { GpxService } from './gpx.service.js';
import { ItineraryService, toMinutes } from './itinerary.service.js';
import type { UploadedFileData } from '../types/uploaded-file.js';
import { WeatherService } from './weather.service.js';

const MIN_ITINERARY_STOPS = 2;

export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

@Injectable()
export class RoutesService {
  constructor(
    private readonly routes: RoutesRepository,
    @InjectRepository(PointOfInterest)
    private readonly points: Repository<PointOfInterest>,
    private readonly itinerary: ItineraryService,
    private readonly gpx: GpxService,
    private readonly weather: WeatherService,
  ) {}

  listPublished(query: RouteQueryDto): Promise<RoutePageDto> {
    return this.page(query, true);
  }

  listAll(query: AdminRouteQueryDto): Promise<RoutePageDto> {
    return this.page(query, query.isPublished);
  }

  async getPublishedBySlug(slug: string): Promise<RouteDetailDto> {
    const route = await this.routes.findPublishedDetailBySlug(slug);
    if (!route) throw new RouteNotFoundException();
    return RouteDetailDto.fromEntity(route);
  }

  async getById(id: string): Promise<RouteDetailDto> {
    return RouteDetailDto.fromEntity(await this.findDetailOrFail(id));
  }

  async buildItinerary(
    slug: string,
    startTime?: string,
  ): Promise<ItineraryDto> {
    const route = await this.findPublishedOrFail(slug);
    const points = await this.points.find({
      where: { routeId: route.id, isItineraryStop: true },
    });
    return this.itinerary.build(route, points, startTime);
  }

  async getWeather(slug: string): Promise<WeatherForecastDto> {
    return this.weather.forecast(await this.findPublishedOrFail(slug));
  }

  async create(dto: CreateRouteDto): Promise<RouteDetailDto> {
    this.assertStartWindow(dto.startTimeFrom, dto.startTimeTo);
    const route = this.routes.create(dto);
    route.slug = dto.slug ?? slugify(dto.nameEs);
    route.isPublished = false;
    const saved = await this.routes.save(route);
    return this.getById(saved.id);
  }

  async update(id: string, dto: UpdateRouteDto): Promise<RouteDetailDto> {
    const route = await this.findOrFail(id);
    Object.assign(route, dto);
    this.assertStartWindow(route.startTimeFrom, route.startTimeTo);
    await this.routes.save(route);
    return this.getById(id);
  }

  async setPublication(
    id: string,
    isPublished: boolean,
  ): Promise<RouteDetailDto> {
    const route = await this.findOrFail(id);
    if (isPublished) {
      const stops = await this.points.count({
        where: { routeId: id, isItineraryStop: true },
      });
      if (stops < MIN_ITINERARY_STOPS) {
        throw new RouteNotReadyException(MIN_ITINERARY_STOPS);
      }
    }
    route.isPublished = isPublished;
    await this.routes.save(route);
    return this.getById(id);
  }

  async remove(id: string): Promise<void> {
    await this.findOrFail(id);
    await this.routes.softDelete(id);
  }

  async importTrack(
    id: string,
    file: UploadedFileData | undefined,
  ): Promise<TrackSummaryDto> {
    if (!file?.buffer?.length) throw new GpxFileRequiredException();
    const route = await this.findOrFail(id);
    const { track, summary } = this.gpx.parse(file.buffer);

    route.track = track;
    route.distanceKm = summary.distanceKm;
    route.elevationGainM = summary.elevationGainM;
    route.elevationLossM = summary.elevationLossM;
    if (summary.maxAltitudeM !== null)
      route.maxAltitudeM = summary.maxAltitudeM;
    await this.routes.save(route);

    return summary;
  }

  async findOrFail(id: string): Promise<Route> {
    const route = await this.routes.findById(id);
    if (!route) throw new RouteNotFoundException();
    return route;
  }

  private async findDetailOrFail(id: string): Promise<Route> {
    const route = await this.routes.findDetailById(id);
    if (!route) throw new RouteNotFoundException();
    return route;
  }

  private async findPublishedOrFail(slug: string): Promise<Route> {
    const route = await this.routes.findPublishedBySlug(slug);
    if (!route) throw new RouteNotFoundException();
    return route;
  }

  private assertStartWindow(from: string, to: string): void {
    if (toMinutes(from) >= toMinutes(to)) {
      throw new InvalidStartWindowException();
    }
  }

  private async page(
    query: RouteQueryDto,
    isPublished: boolean | undefined,
  ): Promise<RoutePageDto> {
    const [routes, total] = await this.routes.findPage({
      skip: query.skip,
      take: query.limit,
      difficulty: query.difficulty,
      maxDays: query.maxDays,
      search: query.search,
      isPublished,
    });
    return {
      data: routes.map((route) => RouteSummaryDto.fromEntity(route)),
      meta: PaginationMetaDto.of(query.page, query.limit, total),
    };
  }
}
