import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminRouteContentController } from './controllers/admin-route-content.controller.js';
import { AdminRoutesController } from './controllers/admin-routes.controller.js';
import { AdminSpeciesController } from './controllers/admin-species.controller.js';
import { RoutesController } from './controllers/routes.controller.js';
import { GearRecommendation } from './entities/gear-recommendation.entity.js';
import { PointOfInterest } from './entities/point-of-interest.entity.js';
import { RoutePhoto } from './entities/route-photo.entity.js';
import { Route } from './entities/route.entity.js';
import { Species } from './entities/species.entity.js';
import { RoutesRepository } from './repositories/routes.repository.js';
import { GpxService } from './services/gpx.service.js';
import { ItineraryService } from './services/itinerary.service.js';
import { RouteContentService } from './services/route-content.service.js';
import { RoutesService } from './services/routes.service.js';
import { SpeciesService } from './services/species.service.js';
import { TourIntervalService } from './services/tour-interval.service.js';
import { WeatherService } from './services/weather.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Route,
      PointOfInterest,
      GearRecommendation,
      RoutePhoto,
      Species,
    ]),
  ],
  controllers: [
    RoutesController,
    AdminRoutesController,
    AdminRouteContentController,
    AdminSpeciesController,
  ],
  providers: [
    RoutesRepository,
    RoutesService,
    RouteContentService,
    SpeciesService,
    ItineraryService,
    GpxService,
    WeatherService,
    TourIntervalService,
  ],
  exports: [RoutesService, RoutesRepository, TourIntervalService],
})
export class RoutesModule {}
