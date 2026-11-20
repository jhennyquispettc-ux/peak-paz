import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OnOutboxMessage, Outbox } from '@nestjs/outbox';
import { DataSource, EntityManager } from 'typeorm';
import { GuideProfile } from '../guides/entities/guide-profile.entity.js';
import { User } from '../users/entities/user.entity.js';
import { UserRole } from '../users/users.enums.js';
import {
  VerificationClient,
  type VerificationState,
} from './verification.client.js';

@Injectable()
export class AccountVerificationService {
  constructor(
    private readonly db: DataSource,
    private readonly client: VerificationClient,
    private readonly outbox: Outbox<EntityManager>,
  ) {}

  async enqueue(manager: EntityManager, user: User): Promise<void> {
    if (![UserRole.TOURIST, UserRole.GUIDE].includes(user.role)) return;
    await this.outbox.add(manager, {
      topic: 'account.verification',
      key: user.id,
      payload: { userId: user.id },
    });
  }

  @OnOutboxMessage('account.verification', {
    consumer: 'registration-verification',
  })
  async deliver({ userId }: { userId: string }): Promise<void> {
    const user = await this.db.getRepository(User).findOneBy({ id: userId });
    if (user) await this.open(user);
  }

  private open(user: User): Promise<VerificationState> {
    // Passwords and session tokens never cross the service boundary.
    return this.client.call('/cases', {
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
      role: user.role,
    });
  }

  async status(userId: string): Promise<VerificationState> {
    const user = await this.db.getRepository(User).findOneBy({ id: userId });
    if (!user || ![UserRole.GUIDE, UserRole.TOURIST].includes(user.role))
      throw new NotFoundException();
    const state = await this.open(user);
    await this.syncEmail(state);
    return state;
  }

  async resend(userId: string) {
    await this.status(userId);
    return this.client.call<VerificationState>(`/cases/${userId}/resend`, {});
  }

  async confirm(token: string) {
    const state = await this.client.call<
      Pick<VerificationState, 'userId' | 'email' | 'emailVerifiedAt'>
    >('/email/confirm', { token });
    await this.syncEmail(state);
    return { verified: true };
  }

  private async syncEmail(
    state: Pick<VerificationState, 'userId' | 'email' | 'emailVerifiedAt'>,
  ) {
    if (!state.emailVerifiedAt) return;
    await this.db
      .getRepository(User)
      .update(
        { id: state.userId, email: state.email },
        { emailVerifiedAt: new Date(state.emailVerifiedAt) },
      );
  }

  async submitGuide(profile: GuideProfile, resubmit = false) {
    await this.open(profile.user);
    return this.client.call<{ id: string; status: string }>(
      `/cases/${profile.userId}/reviews?resubmit=${resubmit}`,
      {
        firstName: profile.user.firstName,
        lastName: profile.user.lastName,
        nationalId: profile.nationalId,
        documents: profile.documents.map((document) => ({
          id: document.id,
          type: document.type,
          expiresAt: document.expiresAt,
        })),
      },
    );
  }

  async decideGuide(
    profile: GuideProfile,
    status: 'APPROVED' | 'REJECTED',
    adminId: string,
    reason?: string,
  ) {
    const review = await this.submitGuide(profile);
    if (review.status !== 'PENDING' && review.status !== status) {
      throw new BadRequestException({
        error: 'REVIEW_ALREADY_DECIDED',
        message: 'El guía debe solicitar una nueva revisión.',
      });
    }
    return this.client.call(
      `/cases/${profile.userId}/reviews/${review.id}/decision`,
      { status, reviewerId: adminId, ...(reason ? { reason } : {}) },
    );
  }
}
