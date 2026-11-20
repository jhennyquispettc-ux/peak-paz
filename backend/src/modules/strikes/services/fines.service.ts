import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { round2 } from '../../payments/money.js';
import { CancellationReviewsRepository } from '../repositories/cancellation-reviews.repository.js';
import { allocateFines } from '../sanctions.js';

@Injectable()
export class FinesService {
  constructor(private readonly reviews: CancellationReviewsRepository) {}

  async settle(
    guideProfileId: string,
    available: number,
    manager: EntityManager,
  ): Promise<number> {
    const pending = await this.reviews.findUnsettledFinesForUpdate(
      guideProfileId,
      manager,
    );
    if (pending.length === 0) return 0;

    const settlements = allocateFines(
      available,
      pending.map((review) => ({
        id: review.id,
        pending: round2(review.fineAmount - review.fineSettled),
      })),
    );
    let total = 0;
    for (const settlement of settlements) {
      const review = pending.find((item) => item.id === settlement.id)!;
      review.fineSettled = round2(review.fineSettled + settlement.amount);
      await this.reviews.save(review, manager);
      total = round2(total + settlement.amount);
    }
    return total;
  }

  pendingForGuide(guideProfileId: string): Promise<number> {
    return this.reviews.sumPendingFines(guideProfileId);
  }
}
