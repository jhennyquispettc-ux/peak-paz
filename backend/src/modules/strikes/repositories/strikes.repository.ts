import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Strike } from '../entities/strike.entity.js';
import { StrikeStatus } from '../strikes.enums.js';

export interface StrikePageFilters {
  skip: number;
  take: number;
  status?: StrikeStatus;
  guideProfileId?: string;
}

@Injectable()
export class StrikesRepository {
  constructor(
    @InjectRepository(Strike) private readonly strikes: Repository<Strike>,
  ) {}

  create(data: Partial<Strike>, manager: EntityManager): Promise<Strike> {
    const repository = manager.getRepository(Strike);
    return repository.save(repository.create(data));
  }

  save(strike: Strike): Promise<Strike> {
    return this.strikes.save(strike);
  }

  findById(id: string): Promise<Strike | null> {
    return this.query().where('strike.id = :id', { id }).getOne();
  }

  async countActiveForGuide(
    guideProfileId: string,
    now: Date,
    manager?: EntityManager,
  ): Promise<number> {
    const repository = manager?.getRepository(Strike) ?? this.strikes;
    const row = await repository
      .createQueryBuilder('strike')
      .innerJoin('strike.booking', 'booking')
      .select('COALESCE(SUM(strike.weight), 0)', 'total')
      .where('booking.guideProfileId = :guideProfileId', { guideProfileId })
      .andWhere('strike.status = :active', { active: StrikeStatus.ACTIVE })
      .andWhere('strike.expiresAt > :now', { now })
      .getRawOne<{ total: string }>();
    return Number(row?.total ?? 0);
  }

  findForGuide(guideProfileId: string): Promise<Strike[]> {
    return this.query()
      .where('booking.guideProfileId = :guideProfileId', { guideProfileId })
      .getMany();
  }

  findPage(filters: StrikePageFilters): Promise<[Strike[], number]> {
    const query = this.query().skip(filters.skip).take(filters.take);
    if (filters.status) {
      query.andWhere('strike.status = :status', { status: filters.status });
    }
    if (filters.guideProfileId) {
      query.andWhere('booking.guideProfileId = :guideProfileId', {
        guideProfileId: filters.guideProfileId,
      });
    }
    return query.getManyAndCount();
  }

  async expireDue(now: Date): Promise<number> {
    const result = await this.strikes
      .createQueryBuilder()
      .update(Strike)
      .set({ status: StrikeStatus.EXPIRED })
      .where('status = :active', { active: StrikeStatus.ACTIVE })
      .andWhere('expires_at <= :now', { now })
      .execute();
    return result.affected ?? 0;
  }

  private query() {
    return this.strikes
      .createQueryBuilder('strike')
      .innerJoinAndSelect('strike.booking', 'booking')
      .leftJoinAndSelect('booking.route', 'route')
      .leftJoinAndSelect('booking.guideProfile', 'guide')
      .leftJoinAndSelect('guide.user', 'guideUser')
      .orderBy('strike.createdAt', 'DESC');
  }
}
