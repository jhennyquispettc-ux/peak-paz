import { Injectable } from '@nestjs/common';
import { weekdayOf } from '../../../common/time/la-paz-time.js';
import { RouteNotFoundException } from '../../routes/exceptions/routes.exceptions.js';
import { RoutesRepository } from '../../routes/repositories/routes.repository.js';
import { TourIntervalService } from '../../routes/services/tour-interval.service.js';
import { SettingsService } from '../../settings/services/settings.service.js';
import { SettingKey } from '../../settings/setting-keys.js';
import { AvailableGuidesQueryDto } from '../dto/available-guides-query.dto.js';
import { PublicGuideDto } from '../dto/public-guide.dto.js';
import { GuideNotFoundException } from '../exceptions/guides.exceptions.js';
import {
  busyWindow,
  GuidesRepository,
} from '../repositories/guides.repository.js';

@Injectable()
export class PublicGuidesService {
  constructor(
    private readonly guides: GuidesRepository,
    private readonly routes: RoutesRepository,
    private readonly tourIntervals: TourIntervalService,
    private readonly settings: SettingsService,
  ) {}

  async getById(id: string): Promise<PublicGuideDto> {
    const profile = await this.guides.findPublicById(id);
    if (!profile) throw new GuideNotFoundException();
    return PublicGuideDto.fromEntity(profile);
  }

  async listForRoute(
    slug: string,
    query: AvailableGuidesQueryDto,
  ): Promise<PublicGuideDto[]> {
    const route = await this.routes.findPublishedBySlug(slug);
    if (!route) throw new RouteNotFoundException();

    let slot;
    if (query.date && query.startTime) {
      const interval = await this.tourIntervals.forTour(
        route,
        query.date,
        query.startTime,
      );
      const buffer = await this.settings.getNumber(
        SettingKey.SCHEDULE_BUFFER_MIN,
      );
      slot = {
        date: query.date,
        weekday: weekdayOf(query.date),
        startTime: query.startTime,
        ...busyWindow(interval, buffer),
      };
    }

    const guides = await this.guides.findAvailableForRoute({
      routeId: route.id,
      slot,
    });
    return guides.map((guide) =>
      PublicGuideDto.fromEntity(Object.assign(guide, { routes: [] })),
    );
  }
}
