import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../../../common/dto/error-response.dto.js';
import { CurrentUser } from '../../auth/decorators/current-user.decorator.js';
import { Roles } from '../../auth/decorators/roles.decorator.js';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.js';
import { UpdateProfileDto } from '../dto/update-profile.dto.js';
import { UpdateUserStatusDto } from '../dto/update-user-status.dto.js';
import { UserPageDto } from '../dto/user-page.dto.js';
import { UserQueryDto } from '../dto/user-query.dto.js';
import { UserDto } from '../dto/user.dto.js';
import { UsersService } from '../services/users.service.js';
import { UserRole } from '../users.enums.js';

@ApiTags('Users')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Perfil del usuario autenticado' })
  @ApiOkResponse({ type: UserDto })
  getMe(@CurrentUser() user: AuthenticatedUser): Promise<UserDto> {
    return this.usersService.getById(user.id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Actualizar el perfil propio' })
  @ApiOkResponse({ type: UserDto })
  updateMe(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ): Promise<UserDto> {
    return this.usersService.updateProfile(user.id, dto);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Listar usuarios (solo admin)' })
  @ApiOkResponse({ type: UserPageDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  list(@Query() query: UserQueryDto): Promise<UserPageDto> {
    return this.usersService.list(query);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Ver un usuario (solo admin)' })
  @ApiOkResponse({ type: UserDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  getOne(@Param('id', ParseUUIDPipe) id: string): Promise<UserDto> {
    return this.usersService.getById(id);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Suspender o reactivar un usuario (solo admin)' })
  @ApiOkResponse({ type: UserDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserStatusDto,
    @CurrentUser() admin: AuthenticatedUser,
  ): Promise<UserDto> {
    return this.usersService.updateStatus(id, dto.status, admin.id);
  }
}
