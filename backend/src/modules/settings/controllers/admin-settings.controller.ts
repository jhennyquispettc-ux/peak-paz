import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../../../common/dto/error-response.dto.js';
import { Roles } from '../../auth/decorators/roles.decorator.js';
import { UserRole } from '../../users/users.enums.js';
import { SettingDto } from '../dto/setting.dto.js';
import { UpdateSettingDto } from '../dto/update-setting.dto.js';
import { SettingsService } from '../services/settings.service.js';

@ApiTags('Admin / Settings')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@ApiForbiddenResponse({ type: ErrorResponseDto })
@Roles(UserRole.ADMIN)
@Controller('admin/settings')
export class AdminSettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar las reglas configurables del negocio' })
  @ApiOkResponse({ type: [SettingDto] })
  list(): Promise<SettingDto[]> {
    return this.settings.list();
  }

  @Patch(':key')
  @ApiOperation({ summary: 'Cambiar el valor de una regla' })
  @ApiOkResponse({ type: SettingDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  update(
    @Param('key') key: string,
    @Body() dto: UpdateSettingDto,
  ): Promise<SettingDto> {
    return this.settings.update(key, dto.value);
  }
}
