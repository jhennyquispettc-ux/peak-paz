import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { User } from '../entities/user.entity.js';
import { UserRole, UserStatus } from '../users.enums.js';

export interface UserPageFilters {
  skip: number;
  take: number;
  role?: UserRole;
  status?: UserStatus;
  search?: string;
}

@Injectable()
export class UsersRepository {
  constructor(
    @InjectRepository(User) private readonly repository: Repository<User>,
  ) {}

  findById(id: string): Promise<User | null> {
    return this.repository.findOne({ where: { id } });
  }

  findByEmailWithPassword(email: string): Promise<User | null> {
    return this.repository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('LOWER(user.email) = LOWER(:email)', { email })
      .getOne();
  }

  existsByEmail(email: string): Promise<boolean> {
    return this.repository
      .createQueryBuilder('user')
      .withDeleted()
      .where('LOWER(user.email) = LOWER(:email)', { email })
      .getExists();
  }

  create(data: Partial<User>): User {
    return this.repository.create(data);
  }

  save(user: User): Promise<User> {
    return this.repository.save(user);
  }

  async updateStatus(
    id: string,
    status: UserStatus,
    manager: EntityManager,
  ): Promise<void> {
    await manager.getRepository(User).update({ id }, { status });
  }

  findPage(filters: UserPageFilters): Promise<[User[], number]> {
    const query = this.repository
      .createQueryBuilder('user')
      .orderBy('user.createdAt', 'DESC')
      .skip(filters.skip)
      .take(filters.take);

    if (filters.role) {
      query.andWhere('user.role = :role', { role: filters.role });
    }
    if (filters.status) {
      query.andWhere('user.status = :status', { status: filters.status });
    }
    if (filters.search) {
      query.andWhere(
        '(user.email ILIKE :search OR user.firstName ILIKE :search OR user.lastName ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    return query.getManyAndCount();
  }
}
