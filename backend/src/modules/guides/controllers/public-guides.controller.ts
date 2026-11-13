import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../../../common/dto/error-response.dto.js';
import { Public } from '../../auth/decorators/public.decorator.js';
import { AvailableGuidesQueryDto } from '../dto/available-guides-query.dto.js';
import { PublicGuideDto } from '../dto/public-guide.dto.js';
import { PublicGuidesService } from '../services/public-guides.service.js';

@ApiTags('Guides')
@Public()
@Controller()
export class PublicGuidesController {
  constructor(private readonly publicGuides: PublicGuidesService) {}

  @Get('routes/:slug/guides')
  @ApiOperation({
    summary:
      'Guías autorizados para una ruta, opcionalmente libres en una fecha',
  })
  @ApiOkResponse({ type: [PublicGuideDto] })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  listForRoute(
    @Param('slug') slug: string,
    @Query() query: AvailableGuidesQueryDto,
  ): Promise<PublicGuideDto[]> {
    return this.publicGuides.listForRoute(slug, query);
  }

  @Get('guides/:id')
  @ApiOperation({ summary: 'Perfil público de un guía aprobado' })
  @ApiOkResponse({ type: PublicGuideDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  getOne(@Param('id', ParseUUIDPipe) id: string): Promise<PublicGuideDto> {
    return this.publicGuides.getById(id);
  }
}
