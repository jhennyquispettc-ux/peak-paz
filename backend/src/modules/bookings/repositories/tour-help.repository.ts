import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { TourHelpStatus } from '../bookings.enums.js';
import { TourHelpRequest } from '../entities/tour-help-request.entity.js';

const DETAIL_RELATIONS = {
  booking: {
    route: true,
    tourist: true,
    guideProfile: { user: true },
    groupDeparture: { route: true, agency: { user: true } },
  },
} as const;

@Injectable()
export class TourHelpRepository {
  constructor(
    @InjectRepository(TourHelpRequest)
    private readonly requests: Repository<TourHelpRequest>,
  ) {}

  create(
    data: Partial<TourHelpRequest>,
    manager: EntityManager,
  ): Promise<TourHelpRequest> {
    const repository = manager.getRepository(TourHelpRequest);
    return repository.save(repository.create(data));
  }

  save(
    help: TourHelpRequest,
    manager: EntityManager,
  ): Promise<TourHelpRequest> {
    return manager.getRepository(TourHelpRequest).save(help);
  }

  hasOpen(bookingId: string, manager: EntityManager): Promise<boolean> {
    return manager
      .getRepository(TourHelpRequest)
      .exists({ where: { bookingId, status: TourHelpStatus.OPEN } });
  }

  findById(
    id: string,
    manager?: EntityManager,
  ): Promise<TourHelpRequest | null> {
    const repository = manager?.getRepository(TourHelpRequest) ?? this.requests;
    return repository.findOne({ where: { id }, relations: DETAIL_RELATIONS });
  }

  lockById(
    id: string,
    manager: EntityManager,
  ): Promise<TourHelpRequest | null> {
    return manager
      .getRepository(TourHelpRequest)
      .createQueryBuilder('help')
      .where('help.id = :id', { id })
      .setLock('pessimistic_write')
      .getOne();
  }

  findByBooking(bookingId: string): Promise<TourHelpRequest[]> {
    return this.requests.find({
      where: { bookingId },
      relations: { booking: true },
      order: { createdAt: 'DESC' },
    });
  }

  findPage(filters: {
    skip: number;
    take: number;
    status?: TourHelpStatus;
  }): Promise<[TourHelpRequest[], number]> {
    return this.requests.findAndCount({
      where: filters.status ? { status: filters.status } : {},
      relations: DETAIL_RELATIONS,
      order: { createdAt: 'ASC' },
      skip: filters.skip,
      take: filters.take,
    });
  }
}
