import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { RescheduleResponse } from '../bookings.enums.js';
import { Reschedule } from '../entities/reschedule.entity.js';

@Injectable()
export class ReschedulesRepository {
  constructor(
    @InjectRepository(Reschedule)
    private readonly reschedules: Repository<Reschedule>,
  ) {}

  create(
    data: Partial<Reschedule>,
    manager: EntityManager,
  ): Promise<Reschedule> {
    const repository = manager.getRepository(Reschedule);
    return repository.save(repository.create(data));
  }

  save(reschedule: Reschedule, manager: EntityManager): Promise<Reschedule> {
    return manager.getRepository(Reschedule).save(reschedule);
  }

  hasPending(bookingId: string, manager: EntityManager): Promise<boolean> {
    return manager.getRepository(Reschedule).exists({
      where: { bookingId, response: RescheduleResponse.PENDING },
    });
  }

  findForBooking(
    id: string,
    bookingId: string,
    manager: EntityManager,
  ): Promise<Reschedule | null> {
    return manager
      .getRepository(Reschedule)
      .createQueryBuilder('reschedule')
      .where('reschedule.id = :id', { id })
      .andWhere('reschedule.bookingId = :bookingId', { bookingId })
      .setLock('pessimistic_write')
      .getOne();
  }

  listForBooking(bookingId: string): Promise<Reschedule[]> {
    return this.reschedules.find({
      where: { bookingId },
      order: { createdAt: 'DESC' },
    });
  }

  async expireDue(now: Date): Promise<number> {
    const result = await this.reschedules
      .createQueryBuilder()
      .update(Reschedule)
      .set({ response: RescheduleResponse.EXPIRED, respondedAt: now })
      .where('response = :pending', { pending: RescheduleResponse.PENDING })
      .andWhere('respond_by <= :now', { now })
      .execute();
    return result.affected ?? 0;
  }
}
