import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiConsumes,
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
import { AdminRouteQueryDto } from '../dto/admin-route-query.dto.js';
import { CreateRouteDto } from '../dto/create-route.dto.js';
import { RouteDetailDto } from '../dto/route-detail.dto.js';
import { RoutePageDto } from '../dto/route-page.dto.js';
import { TrackSummaryDto } from '../dto/track-summary.dto.js';
import { UpdatePublicationDto } from '../dto/update-publication.dto.js';
import { UpdateRouteDto } from '../dto/update-route.dto.js';
import { RoutesService } from '../services/routes.service.js';
import type { UploadedFileData } from '../types/uploaded-file.js';

const MAX_GPX_BYTES = 5 * 1024 * 1024;

@ApiTags('Admin / Routes')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@ApiForbiddenResponse({ type: ErrorResponseDto })
@Roles(UserRole.ADMIN)
@Controller('admin/routes')
export class AdminRoutesController {
  constructor(private readonly routesService: RoutesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todas las rutas, publicadas o no' })
  @ApiOkResponse({ type: RoutePageDto })
  list(@Query() query: AdminRouteQueryDto): Promise<RoutePageDto> {
    return this.routesService.listAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Ver una ruta con todo su contenido' })
  @ApiOkResponse({ type: RouteDetailDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  getOne(@Param('id', ParseUUIDPipe) id: string): Promise<RouteDetailDto> {
    return this.routesService.getById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear una ruta como borrador' })
  @ApiCreatedResponse({ type: RouteDetailDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  create(@Body() dto: CreateRouteDto): Promise<RouteDetailDto> {
    return this.routesService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Editar los datos de una ruta' })
  @ApiOkResponse({ type: RouteDetailDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRouteDto,
  ): Promise<RouteDetailDto> {
    return this.routesService.update(id, dto);
  }

  @Patch(':id/publication')
  @ApiOperation({ summary: 'Publicar u ocultar una ruta' })
  @ApiOkResponse({ type: RouteDetailDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  setPublication(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePublicationDto,
  ): Promise<RouteDetailDto> {
    return this.routesService.setPublication(id, dto.isPublished);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Dar de baja una ruta (borrado lógico)' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.routesService.remove(id);
  }

  @Post(':id/track')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_GPX_BYTES } }),
  )
  @ApiOperation({
    summary:
      'Importar el trazado desde un GPX y recalcular distancia y desnivel',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiCreatedResponse({ type: TrackSummaryDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  importTrack(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: UploadedFileData | undefined,
  ): Promise<TrackSummaryDto> {
    return this.routesService.importTrack(id, file);
  }
}
