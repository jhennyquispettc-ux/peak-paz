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
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
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
import { CreateSpeciesDto } from '../dto/create-species.dto.js';
import { SpeciesDto } from '../dto/species.dto.js';
import { UpdateSpeciesDto } from '../dto/update-species.dto.js';
import { SpeciesService } from '../services/species.service.js';

@ApiTags('Admin / Species')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@ApiForbiddenResponse({ type: ErrorResponseDto })
@Roles(UserRole.ADMIN)
@Controller('admin/species')
export class AdminSpeciesController {
  constructor(private readonly speciesService: SpeciesService) {}

  @Get()
  @ApiOperation({ summary: 'Catálogo de flora y fauna' })
  @ApiOkResponse({ type: [SpeciesDto] })
  list(): Promise<SpeciesDto[]> {
    return this.speciesService.list();
  }

  @Post()
  @ApiOperation({ summary: 'Agregar una especie' })
  @ApiCreatedResponse({ type: SpeciesDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  create(@Body() dto: CreateSpeciesDto): Promise<SpeciesDto> {
    return this.speciesService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Editar una especie' })
  @ApiOkResponse({ type: SpeciesDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSpeciesDto,
  ): Promise<SpeciesDto> {
    return this.speciesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar una especie y sus vínculos con rutas' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.speciesService.remove(id);
  }
}
