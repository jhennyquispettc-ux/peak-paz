import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { VerificationStatus } from '../../../common/enums/verification-status.enum.js';
import { GuideProfile } from '../entities/guide-profile.entity.js';

export interface GuidePageFilters {
  skip: number;
  take: number;
  status?: VerificationStatus;
  search?: string;
}

const PROFILE_RELATIONS = {
  user: true,
  documents: true,
  routes: { route: true },
};

@Injectable()
export class GuidesRepository {
  constructor(
    @InjectRepository(GuideProfile)
    private readonly repository: Repository<GuideProfile>,
  ) {}

  findById(id: string): Promise<GuideProfile | null> {
    return this.repository.findOne({
      where: { id },
      relations: PROFILE_RELATIONS,
    });
  }

  findByUserId(userId: string): Promise<GuideProfile | null> {
    return this.repository.findOne({
      where: { userId },
      relations: PROFILE_RELATIONS,
    });
  }

  findIdByUserId(userId: string): Promise<GuideProfile | null> {
    return this.repository.findOne({ where: { userId } });
  }

  create(data: Partial<GuideProfile>, manager?: EntityManager): GuideProfile {
    return (manager?.getRepository(GuideProfile) ?? this.repository).create(
      data,
    );
  }

  save(profile: GuideProfile, manager?: EntityManager): Promise<GuideProfile> {
    return (manager?.getRepository(GuideProfile) ?? this.repository).save(
      profile,
    );
  }

  findPage(filters: GuidePageFilters): Promise<[GuideProfile[], number]> {
    const query = this.repository
      .createQueryBuilder('guide')
      .innerJoinAndSelect('guide.user', 'user')
      .leftJoinAndSelect('guide.documents', 'document')
      .orderBy('guide.createdAt', 'ASC')
      .skip(filters.skip)
      .take(filters.take);

    if (filters.status) {
      query.andWhere('guide.verificationStatus = :status', {
        status: filters.status,
      });
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
