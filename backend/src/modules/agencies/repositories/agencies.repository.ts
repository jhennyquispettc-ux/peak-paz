import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { VerificationStatus } from '../../../common/enums/verification-status.enum.js';
import { Agency } from '../entities/agency.entity.js';

export interface AgencyPageFilters {
  skip: number;
  take: number;
  status?: VerificationStatus;
  search?: string;
}

const AGENCY_RELATIONS = { user: true, documents: true };

@Injectable()
export class AgenciesRepository {
  constructor(
    @InjectRepository(Agency) private readonly repository: Repository<Agency>,
  ) {}

  findById(id: string): Promise<Agency | null> {
    return this.repository.findOne({
      where: { id },
      relations: AGENCY_RELATIONS,
    });
  }

  findByUserId(userId: string): Promise<Agency | null> {
    return this.repository.findOne({
      where: { userId },
      relations: AGENCY_RELATIONS,
    });
  }

  findPlainById(id: string, manager?: EntityManager): Promise<Agency | null> {
    const repository = manager?.getRepository(Agency) ?? this.repository;
    return repository.findOne({ where: { id } });
  }

  async updateRating(
    id: string,
    ratingAverage: number,
    reviewsCount: number,
    manager: EntityManager,
  ): Promise<void> {
    await manager
      .getRepository(Agency)
      .update({ id }, { ratingAverage, reviewsCount });
  }

  async hideUntil(
    id: string,
    until: Date,
    manager: EntityManager,
  ): Promise<void> {
    await manager.getRepository(Agency).update({ id }, { hiddenUntil: until });
  }

  findIdByUserId(userId: string): Promise<Agency | null> {
    return this.repository.findOne({ where: { userId } });
  }

  async existsByTaxId(taxId: string): Promise<boolean> {
    return this.repository.exists({ where: { taxId } });
  }

  create(data: Partial<Agency>, manager?: EntityManager): Agency {
    return (manager?.getRepository(Agency) ?? this.repository).create(data);
  }

  save(agency: Agency, manager?: EntityManager): Promise<Agency> {
    return (manager?.getRepository(Agency) ?? this.repository).save(agency);
  }

  findPage(filters: AgencyPageFilters): Promise<[Agency[], number]> {
    const query = this.repository
      .createQueryBuilder('agency')
      .innerJoinAndSelect('agency.user', 'user')
      .leftJoinAndSelect('agency.documents', 'document')
      .orderBy('agency.createdAt', 'ASC')
      .skip(filters.skip)
      .take(filters.take);

    if (filters.status) {
      query.andWhere('agency.verificationStatus = :status', {
        status: filters.status,
      });
    }
    if (filters.search) {
      query.andWhere(
        '(agency.legalName ILIKE :search OR agency.taxId ILIKE :search OR user.email ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    return query.getManyAndCount();
  }
}
