import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AppConfig } from '../../../config/app.config.js';
import { UserDto } from '../../users/dto/user.dto.js';
import { User } from '../../users/entities/user.entity.js';
import { UsersRepository } from '../../users/repositories/users.repository.js';
import { UserRole, UserStatus } from '../../users/users.enums.js';
import { AuthResponseDto } from '../dto/auth-response.dto.js';
import { LoginDto } from '../dto/login.dto.js';
import { RegisterDto } from '../dto/register.dto.js';
import {
  EmailAlreadyRegisteredException,
  InvalidCredentialsException,
  UserSuspendedException,
} from '../exceptions/auth.exceptions.js';
import { JwtPayload } from '../types/authenticated-user.js';
import { PasswordService } from './password.service.js';

@Injectable()
export class AuthService {
  private readonly dummyHash: Promise<string>;

  constructor(
    private readonly users: UsersRepository,
    private readonly passwords: PasswordService,
    private readonly jwt: JwtService,
    private readonly config: AppConfig,
  ) {
    this.dummyHash = this.passwords.hash('timing-equalizer-password');
  }

  async registerTourist(dto: RegisterDto): Promise<AuthResponseDto> {
    if (await this.users.existsByEmail(dto.email)) {
      throw new EmailAlreadyRegisteredException();
    }

    const user = this.users.create({
      email: dto.email,
      passwordHash: await this.passwords.hash(dto.password),
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone ?? null,
      country: dto.country ?? null,
      language: dto.language,
      role: UserRole.TOURIST,
      status: UserStatus.ACTIVE,
    });

    return this.buildSession(await this.users.save(user));
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.users.findByEmailWithPassword(dto.email);
    const storedHash = user?.passwordHash ?? (await this.dummyHash);
    const passwordMatches = await this.passwords.verify(
      dto.password,
      storedHash,
    );

    if (!user || !passwordMatches) throw new InvalidCredentialsException();
    if (user.status === UserStatus.SUSPENDED) {
      throw new UserSuspendedException();
    }

    return this.buildSession(user);
  }

  private async buildSession(user: User): Promise<AuthResponseDto> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    return {
      accessToken: await this.jwt.signAsync(payload),
      tokenType: 'Bearer',
      expiresIn: this.config.jwt.expiresIn,
      user: UserDto.fromEntity(user),
    };
  }
}
