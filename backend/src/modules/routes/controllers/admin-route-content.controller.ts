import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../../../common/dto/error-response.dto.js';
import { Roles } from '../../auth/decorators/roles.decorator.js';
import { UserRole } from '../../users/users.enums.js';
import { CreateGearRecommendationDto } from '../dto/create-gear-recommendation.dto.js';
import { CreatePointOfInterestDto } from '../dto/create-point-of-interest.dto.js';
import { CreateRoutePhotoDto } from '../dto/create-route-photo.dto.js';
import { GearRecommendationDto } from '../dto/gear-recommendation.dto.js';
import { PointOfInterestDto } from '../dto/point-of-interest.dto.js';
import { RoutePhotoDto } from '../dto/route-photo.dto.js';
import { SetRouteSpeciesDto } from '../dto/set-route-species.dto.js';
import { SpeciesDto } from '../dto/species.dto.js';
import { UpdateGearRecommendationDto } from '../dto/update-gear-recommendation.dto.js';
import { UpdatePointOfInterestDto } from '../dto/update-point-of-interest.dto.js';
import { RouteContentService } from '../services/route-content.service.js';

@ApiTags('Admin / Route content')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@ApiForbiddenResponse({ type: ErrorResponseDto })
@ApiNotFoundResponse({ type: ErrorResponseDto })
@Roles(UserRole.ADMIN)
@Controller('admin/routes/:routeId')
export class AdminRouteContentController {
  constructor(private readonly content: RouteContentService) {}

  @Post('points')
  @ApiOperation({ summary: 'Agregar un punto de interés o parada' })
  @ApiCreatedResponse({ type: PointOfInterestDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  addPoint(
    @Param('routeId', ParseUUIDPipe) routeId: string,
    @Body() dto: CreatePointOfInterestDto,
  ): Promise<PointOfInterestDto> {
    return this.content.addPoint(routeId, dto);
  }

  @Patch('points/:pointId')
  @ApiOperation({ summary: 'Editar un punto de interés' })
  @ApiOkResponse({ type: PointOfInterestDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  updatePoint(
    @Param('routeId', ParseUUIDPipe) routeId: string,
    @Param('pointId', ParseUUIDPipe) pointId: string,
    @Body() dto: UpdatePointOfInterestDto,
  ): Promise<PointOfInterestDto> {
    return this.content.updatePoint(routeId, pointId, dto);
  }

  @Delete('points/:pointId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar un punto de interés' })
  @ApiNoContentResponse()
  removePoint(
    @Param('routeId', ParseUUIDPipe) routeId: string,
    @Param('pointId', ParseUUIDPipe) pointId: string,
  ): Promise<void> {
    return this.content.removePoint(routeId, pointId);
  }

  @Post('gear')
  @ApiOperation({ summary: 'Agregar un elemento a la lista de equipo' })
  @ApiCreatedResponse({ type: GearRecommendationDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  addGear(
    @Param('routeId', ParseUUIDPipe) routeId: string,
    @Body() dto: CreateGearRecommendationDto,
  ): Promise<GearRecommendationDto> {
    return this.content.addGear(routeId, dto);
  }

  @Patch('gear/:gearId')
  @ApiOperation({ summary: 'Editar un elemento de la lista de equipo' })
  @ApiOkResponse({ type: GearRecommendationDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  updateGear(
    @Param('routeId', ParseUUIDPipe) routeId: string,
    @Param('gearId', ParseUUIDPipe) gearId: string,
    @Body() dto: UpdateGearRecommendationDto,
  ): Promise<GearRecommendationDto> {
    return this.content.updateGear(routeId, gearId, dto);
  }

  @Delete('gear/:gearId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar un elemento de la lista de equipo' })
  @ApiNoContentResponse()
  removeGear(
    @Param('routeId', ParseUUIDPipe) routeId: string,
    @Param('gearId', ParseUUIDPipe) gearId: string,
  ): Promise<void> {
    return this.content.removeGear(routeId, gearId);
  }

  @Post('photos')
  @ApiOperation({ summary: 'Registrar una foto ya subida al almacenamiento' })
  @ApiCreatedResponse({ type: RoutePhotoDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  addPhoto(
    @Param('routeId', ParseUUIDPipe) routeId: string,
    @Body() dto: CreateRoutePhotoDto,
  ): Promise<RoutePhotoDto> {
    return this.content.addPhoto(routeId, dto);
  }

  @Delete('photos/:photoId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Quitar una foto de la ruta' })
  @ApiNoContentResponse()
  removePhoto(
    @Param('routeId', ParseUUIDPipe) routeId: string,
    @Param('photoId', ParseUUIDPipe) photoId: string,
  ): Promise<void> {
    return this.content.removePhoto(routeId, photoId);
  }

  @Put('species')
  @ApiOperation({ summary: 'Definir la flora y fauna de la ruta' })
  @ApiOkResponse({ type: [SpeciesDto] })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  setSpecies(
    @Param('routeId', ParseUUIDPipe) routeId: string,
    @Body() dto: SetRouteSpeciesDto,
  ): Promise<SpeciesDto[]> {
    return this.content.setSpecies(routeId, dto.speciesIds);
  }
}
