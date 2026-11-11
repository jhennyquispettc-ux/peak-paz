import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import { AppConfig } from '../../../config/app.config.js';
import { RegisterAgencyDto } from '../../agencies/dto/register-agency.dto.js';
import { AgencyProfilesService } from '../../agencies/services/agency-profiles.service.js';
import { RegisterGuideDto } from '../../guides/dto/register-guide.dto.js';
import { GuideProfilesService } from '../../guides/services/guide-profiles.service.js';
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
  TaxIdAlreadyRegisteredException,
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
    private readonly dataSource: DataSource,
    private readonly guideProfiles: GuideProfilesService,
    private readonly agencyProfiles: AgencyProfilesService,
  ) {
    this.dummyHash = this.passwords.hash('timing-equalizer-password');
  }

  async registerTourist(dto: RegisterDto): Promise<AuthResponseDto> {
    await this.assertEmailAvailable(dto.email);
    const user = await this.buildUser(dto, UserRole.TOURIST);
    return this.buildSession(await this.users.save(user));
  }

  async registerGuide(dto: RegisterGuideDto): Promise<AuthResponseDto> {
    await this.assertEmailAvailable(dto.email);
    const user = await this.buildUser(dto, UserRole.GUIDE);

    const saved = await this.dataSource.transaction(async (manager) => {
      const created = await manager.getRepository(User).save(user);
      await this.guideProfiles.createForUser(manager, created, dto);
      return created;
    });
    return this.buildSession(saved);
  }

  async registerAgency(dto: RegisterAgencyDto): Promise<AuthResponseDto> {
    await this.assertEmailAvailable(dto.email);
    if (await this.agencyProfiles.existsByTaxId(dto.taxId)) {
      throw new TaxIdAlreadyRegisteredException();
    }
    const user = await this.buildUser(dto, UserRole.AGENCY);

    const saved = await this.dataSource.transaction(async (manager) => {
      const created = await manager.getRepository(User).save(user);
      await this.agencyProfiles.createForUser(manager, created, dto);
      return created;
    });
    return this.buildSession(saved);
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

  private async assertEmailAvailable(email: string): Promise<void> {
    if (await this.users.existsByEmail(email)) {
      throw new EmailAlreadyRegisteredException();
    }
  }

  private async buildUser(dto: RegisterDto, role: UserRole): Promise<User> {
    return this.users.create({
      email: dto.email,
      passwordHash: await this.passwords.hash(dto.password),
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone ?? null,
      country: dto.country ?? null,
      language: dto.language,
      role,
      status: UserStatus.ACTIVE,
    });
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
