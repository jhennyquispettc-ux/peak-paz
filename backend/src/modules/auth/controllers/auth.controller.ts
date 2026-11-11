import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../../../common/dto/error-response.dto.js';
import { Public } from '../decorators/public.decorator.js';
import { AuthResponseDto } from '../dto/auth-response.dto.js';
import { LoginDto } from '../dto/login.dto.js';
import { RegisterAgencyDto } from '../../agencies/dto/register-agency.dto.js';
import { RegisterGuideDto } from '../../guides/dto/register-guide.dto.js';
import { RegisterDto } from '../dto/register.dto.js';
import { AuthService } from '../services/auth.service.js';

@ApiTags('Auth')
@Public()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Registrar una cuenta de turista' })
  @ApiCreatedResponse({ type: AuthResponseDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  register(@Body() dto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.registerTourist(dto);
  }

  @Post('register/guide')
  @ApiOperation({
    summary: 'Registrar una cuenta de guía, pendiente de verificación',
  })
  @ApiCreatedResponse({ type: AuthResponseDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  registerGuide(@Body() dto: RegisterGuideDto): Promise<AuthResponseDto> {
    return this.authService.registerGuide(dto);
  }

  @Post('register/agency')
  @ApiOperation({
    summary: 'Registrar una cuenta de agencia, pendiente de verificación',
  })
  @ApiCreatedResponse({ type: AuthResponseDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  registerAgency(@Body() dto: RegisterAgencyDto): Promise<AuthResponseDto> {
    return this.authService.registerAgency(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesión y obtener un token JWT' })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(dto);
  }
}
