import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { round2 } from '../../payments/money.js';
import { CancellationReview } from '../entities/cancellation-review.entity.js';
import { Complaint } from '../entities/complaint.entity.js';
import { CancellationReviewsRepository } from '../repositories/cancellation-reviews.repository.js';
import { ComplaintsRepository } from '../repositories/complaints.repository.js';
import { allocateFines, SanctionedProvider } from '../sanctions.js';

interface PendingCharge {
  id: string;
  pending: number;
  createdAt: Date;
  apply: (amount: number) => Promise<void>;
}

@Injectable()
export class FinesService {
  constructor(
    private readonly reviews: CancellationReviewsRepository,
    private readonly complaints: ComplaintsRepository,
  ) {}

  async settle(
    provider: SanctionedProvider,
    available: number,
    manager: EntityManager,
  ): Promise<number> {
    const [reviews, complaints] = await Promise.all([
      this.reviews.findUnsettledFinesForUpdate(provider, manager),
      this.complaints.findUnsettledForUpdate(provider, manager),
    ]);
    const charges = [
      ...reviews.map((review) => this.reviewCharge(review, manager)),
      ...complaints.map((complaint) =>
        this.complaintCharge(complaint, manager),
      ),
    ].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    if (charges.length === 0) return 0;

    const settlements = allocateFines(available, charges);
    let total = 0;
    for (const settlement of settlements) {
      await charges
        .find((charge) => charge.id === settlement.id)!
        .apply(settlement.amount);
      total = round2(total + settlement.amount);
    }
    return total;
  }

  async pendingFor(provider: SanctionedProvider): Promise<number> {
    const [fines, deductions] = await Promise.all([
      this.reviews.sumPendingFines(provider),
      this.complaints.sumPending(provider),
    ]);
    return round2(fines + deductions);
  }

  private reviewCharge(
    review: CancellationReview,
    manager: EntityManager,
  ): PendingCharge {
    return {
      id: review.id,
      pending: round2(review.fineAmount - review.fineSettled),
      createdAt: review.createdAt,
      apply: async (amount) => {
        review.fineSettled = round2(review.fineSettled + amount);
        await this.reviews.save(review, manager);
      },
    };
  }

  private complaintCharge(
    complaint: Complaint,
    manager: EntityManager,
  ): PendingCharge {
    return {
      id: complaint.id,
      pending: round2(complaint.deductionAmount - complaint.deductionSettled),
      createdAt: complaint.createdAt,
      apply: async (amount) => {
        complaint.deductionSettled = round2(
          complaint.deductionSettled + amount,
        );
        await this.complaints.save(complaint, manager);
      },
    };
  }
}
