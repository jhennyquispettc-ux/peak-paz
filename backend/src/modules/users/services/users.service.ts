import { Injectable } from '@nestjs/common';
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
  constructor(private readonly users: UsersRepository) {}

  async getById(id: string): Promise<UserDto> {
    return UserDto.fromEntity(await this.findOrFail(id));
  }

  async updateProfile(id: string, dto: UpdateProfileDto): Promise<UserDto> {
    const user = await this.findOrFail(id);
    Object.assign(user, dto);
    return UserDto.fromEntity(await this.users.save(user));
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
    user.status = status;
    return UserDto.fromEntity(await this.users.save(user));
  }

  private async findOrFail(id: string): Promise<User> {
    const user = await this.users.findById(id);
    if (!user) throw new UserNotFoundException();
    return user;
  }
}
