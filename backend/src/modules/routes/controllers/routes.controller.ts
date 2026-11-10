import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../../../common/dto/error-response.dto.js';
import { Public } from '../../auth/decorators/public.decorator.js';
import { ItineraryQueryDto } from '../dto/itinerary-query.dto.js';
import { ItineraryDto } from '../dto/itinerary.dto.js';
import { RouteDetailDto } from '../dto/route-detail.dto.js';
import { RoutePageDto } from '../dto/route-page.dto.js';
import { RouteQueryDto } from '../dto/route-query.dto.js';
import { WeatherForecastDto } from '../dto/weather.dto.js';
import { RoutesService } from '../services/routes.service.js';

@ApiTags('Routes')
@Public()
@Controller('routes')
export class RoutesController {
  constructor(private readonly routesService: RoutesService) {}

  @Get()
  @ApiOperation({ summary: 'Catálogo público de rutas publicadas' })
  @ApiOkResponse({ type: RoutePageDto })
  list(@Query() query: RouteQueryDto): Promise<RoutePageDto> {
    return this.routesService.listPublished(query);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Ficha completa de una ruta publicada' })
  @ApiOkResponse({ type: RouteDetailDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  getOne(@Param('slug') slug: string): Promise<RouteDetailDto> {
    return this.routesService.getPublishedBySlug(slug);
  }

  @Get(':slug/itinerary')
  @ApiOperation({ summary: 'Itinerario con horas según la hora de inicio' })
  @ApiOkResponse({ type: ItineraryDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  itinerary(
    @Param('slug') slug: string,
    @Query() query: ItineraryQueryDto,
  ): Promise<ItineraryDto> {
    return this.routesService.buildItinerary(slug, query.startTime);
  }

  @Get(':slug/weather')
  @ApiOperation({ summary: 'Pronóstico de 7 días en el punto de inicio' })
  @ApiOkResponse({ type: WeatherForecastDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiServiceUnavailableResponse({ type: ErrorResponseDto })
  weather(@Param('slug') slug: string): Promise<WeatherForecastDto> {
    return this.routesService.getWeather(slug);
  }
}
