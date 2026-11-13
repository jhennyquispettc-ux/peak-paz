import { Injectable } from '@nestjs/common';
import { addDays, weekdayOf } from '../../../common/time/la-paz-time.js';
import { RouteNotFoundException } from '../../routes/exceptions/routes.exceptions.js';
import { RoutesRepository } from '../../routes/repositories/routes.repository.js';
import { AvailableGuidesQueryDto } from '../dto/available-guides-query.dto.js';
import { PublicGuideDto } from '../dto/public-guide.dto.js';
import { GuideNotFoundException } from '../exceptions/guides.exceptions.js';
import { GuidesRepository } from '../repositories/guides.repository.js';

@Injectable()
export class PublicGuidesService {
  constructor(
    private readonly guides: GuidesRepository,
    private readonly routes: RoutesRepository,
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

    const guides = await this.guides.findAvailableForRoute({
      routeId: route.id,
      slot:
        query.date && query.startTime
          ? {
              startDate: query.date,
              endDate: addDays(query.date, route.days - 1),
              weekday: weekdayOf(query.date),
              startTime: query.startTime,
            }
          : undefined,
    });
    return guides.map((guide) =>
      PublicGuideDto.fromEntity(Object.assign(guide, { routes: [] })),
    );
  }
}
