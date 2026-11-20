import { DataSource } from 'typeorm';
import { GuideProfile } from '../../guides/entities/guide-profile.entity.js';
import { BadRequestException, Injectable } from '@nestjs/common';
import { PaginationMetaDto } from '../../../common/dto/pagination-meta.dto.js';
import { UpdateProfileDto } from '../dto/update-profile.dto.js';
import { UserPageDto } from '../dto/user-page.dto.js';
import { UserQueryDto } from '../dto/user-query.dto.js';
import { UserDto } from '../dto/user.dto.js';
import { User } from '../entities/user.entity.js';
import {
  CannotChangeOwnStatusException,
  UserNotFoundException,
} from '../exceptions/users.exceptions.js';
import { UsersRepository } from '../repositories/users.repository.js';
import { UserStatus } from '../users.enums.js';

@Injectable()
export class UsersService {
  constructor(
    private readonly users: UsersRepository,
    private readonly db: DataSource,
  ) {}

  async getById(id: string): Promise<UserDto> {
    return UserDto.fromEntity(await this.findOrFail(id));
  }

  async updateProfile(id: string, dto: UpdateProfileDto): Promise<UserDto> {
    return this.db.transaction(async (manager) => {
      const guide = await manager
        .getRepository(GuideProfile)
        .findOne({
          where: { userId: id },
          lock: { mode: 'pessimistic_write' },
        });
      const user = await manager.getRepository(User).findOneBy({ id });
      if (!user) throw new UserNotFoundException();
      const changesIdentity =
        (dto.firstName !== undefined && dto.firstName !== user.firstName) ||
        (dto.lastName !== undefined && dto.lastName !== user.lastName);
      if (changesIdentity && guide?.verificationStatus === 'APPROVED') {
        throw new BadRequestException({
          error: 'PROFILE_LOCKED',
          message:
            'Los datos de identidad aprobados requieren una nueva revisión.',
        });
      }
      await manager.getRepository(User).update(id, dto);
      return UserDto.fromEntity(
        await manager.getRepository(User).findOneByOrFail({ id }),
      );
    });
  }

  async list(query: UserQueryDto): Promise<UserPageDto> {
    const [users, total] = await this.users.findPage({
      skip: query.skip,
      take: query.limit,
      role: query.role,
      status: query.status,
      search: query.search,
    });
    return {
      data: users.map((user) => UserDto.fromEntity(user)),
      meta: PaginationMetaDto.of(query.page, query.limit, total),
    };
  }

  async updateStatus(
    targetId: string,
    status: UserStatus,
    adminId: string,
  ): Promise<UserDto> {
    if (targetId === adminId) throw new CannotChangeOwnStatusException();
    const user = await this.findOrFail(targetId);
    await this.db.getRepository(User).update(user.id, { status });
    return this.getById(user.id);
  }

  private async findOrFail(id: string): Promise<User> {
    const user = await this.users.findById(id);
    if (!user) throw new UserNotFoundException();
    return user;
  }
}
