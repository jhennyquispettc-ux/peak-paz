import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Route } from '../entities/route.entity.js';
import { Difficulty } from '../routes.enums.js';

export interface RoutePageFilters {
  skip: number;
  take: number;
  difficulty?: Difficulty;
  maxDays?: number;
  search?: string;
  isPublished?: boolean;
}

const DETAIL_RELATIONS = {
  pointsOfInterest: true,
  gearRecommendations: true,
  photos: true,
  species: true,
};

@Injectable()
export class RoutesRepository {
  constructor(
    @InjectRepository(Route) private readonly repository: Repository<Route>,
  ) {}

  findById(id: string): Promise<Route | null> {
    return this.repository.findOne({ where: { id } });
  }

  findDetailById(id: string): Promise<Route | null> {
    return this.repository.findOne({
      where: { id },
      relations: DETAIL_RELATIONS,
    });
  }

  findPublishedBySlug(slug: string): Promise<Route | null> {
    return this.repository.findOne({ where: { slug, isPublished: true } });
  }

  findPublishedDetailBySlug(slug: string): Promise<Route | null> {
    return this.repository.findOne({
      where: { slug, isPublished: true },
      relations: DETAIL_RELATIONS,
    });
  }

  findWithSpecies(id: string): Promise<Route | null> {
    return this.repository.findOne({
      where: { id },
      relations: { species: true },
    });
  }

  create(data: Partial<Route>): Route {
    return this.repository.create(data);
  }

  save(route: Route): Promise<Route> {
    return this.repository.save(route);
  }

  async softDelete(id: string): Promise<void> {
    await this.repository.softDelete({ id });
  }

  findPage(filters: RoutePageFilters): Promise<[Route[], number]> {
    const query = this.repository
      .createQueryBuilder('route')
      .leftJoinAndSelect('route.photos', 'photo')
      .orderBy('route.nameEs', 'ASC')
      .addOrderBy('photo.sortOrder', 'ASC')
      .skip(filters.skip)
      .take(filters.take);

    if (filters.isPublished !== undefined) {
      query.andWhere('route.isPublished = :isPublished', {
        isPublished: filters.isPublished,
      });
    }
    if (filters.difficulty) {
      query.andWhere('route.difficulty = :difficulty', {
        difficulty: filters.difficulty,
      });
    }
    if (filters.maxDays) {
      query.andWhere('route.days <= :maxDays', { maxDays: filters.maxDays });
    }
    if (filters.search) {
      query.andWhere(
        '(route.nameEs ILIKE :search OR route.nameEn ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    return query.getManyAndCount();
  }
}
