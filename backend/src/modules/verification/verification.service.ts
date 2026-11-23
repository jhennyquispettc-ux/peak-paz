import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  OnOutboxMessage,
  Outbox,
  type OutboxHandlerContext,
} from '@nestjs/outbox';
import { createHash, createHmac, randomBytes } from 'node:crypto';
import { DataSource, EntityManager } from 'typeorm';
import { GuideProfile } from '../guides/entities/guide-profile.entity.js';
import {
  EMAIL_FAILED_TYPE,
  EMAIL_SEND_TYPE,
  EMAIL_SENT_TYPE,
  Envelope,
} from '../messaging/messaging.contracts.js';
import { MessagingService } from '../messaging/messaging.service.js';
import { User } from '../users/entities/user.entity.js';
import { UserRole } from '../users/users.enums.js';
import type {
  CredentialReview,
  ReviewSnapshot,
} from './entities/credential-review.entity.js';
import type { EmailVerification } from './entities/email-verification.entity.js';
import { VerificationRepository } from './verification.repository.js';

const VERIFIABLE_ROLES = [UserRole.TOURIST, UserRole.GUIDE];
const hash = (value: string) =>
  createHash('sha256').update(value).digest('hex');

export interface VerificationState {
  userId: string;
  email: string;
  emailVerifiedAt: Date | null;
  emailSentAt: Date | null;
  emailFailedAt: Date | null;
  nextResendAt: Date;
  tokenExpiresAt: Date | null;
  reviews: Pick<
    CredentialReview,
    'id' | 'status' | 'reason' | 'createdAt' | 'decidedAt' | 'reviewerId'
  >[];
}

@Injectable()
export class AccountVerificationService implements OnModuleInit {
  constructor(
    private readonly db: DataSource,
    private readonly records: VerificationRepository,
    private readonly messaging: MessagingService,
    private readonly config: ConfigService,
    private readonly outbox: Outbox<EntityManager>,
  ) {}

  onModuleInit(): void {
    this.messaging.onEvent(EMAIL_SENT_TYPE, (event) =>
      this.recordDelivery(event, {
        emailSentAt: new Date(),
        emailFailedAt: null,
      }),
    );
    this.messaging.onEvent(EMAIL_FAILED_TYPE, (event) =>
      this.recordDelivery(event, { emailFailedAt: new Date() }),
    );
  }

  async enqueue(manager: EntityManager, user: User): Promise<void> {
    if (!VERIFIABLE_ROLES.includes(user.role)) return;
    await this.issue(
      this.records.createEmail({ userId: user.id, email: user.email }, manager),
      manager,
    );
  }

  @OnOutboxMessage('account.verification', {
    consumer: 'registration-verification',
  })
  async deliver(
    { userId, nonce }: { userId: string; nonce?: string },
    context: OutboxHandlerContext,
  ): Promise<void> {
    const [record, user] = await Promise.all([
      this.records.findEmail(userId),
      this.db.getRepository(User).findOneBy({ id: userId }),
    ]);
    if (
      !record ||
      !user ||
      user.emailVerifiedAt ||
      !nonce ||
      record.tokenNonce !== nonce ||
      !record.tokenExpiresAt ||
      record.tokenExpiresAt <= new Date()
    ) {
      return;
    }
    const link = new URL(
      '/verificar-correo',
      this.config.getOrThrow<string>('PUBLIC_WEB_URL'),
    );
    link.hash = `token=${this.token(userId, nonce)}`;
    await this.messaging.sendCommand(EMAIL_SEND_TYPE, {
      userId,
      nonce,
      to: record.email,
      firstName: user.firstName,
      language: user.language,
      link: link.toString(),
      expiresInMinutes: this.tokenMinutes,
      deliveryId: context.message.id,
    });
  }

  async status(userId: string): Promise<VerificationState> {
    const user = await this.verifiableUser(userId);
    if (!user.emailVerifiedAt) await this.ensureCase(user);
    const [record, reviews] = await Promise.all([
      this.records.findEmail(userId),
      this.records.listReviews(userId),
    ]);
    return {
      userId,
      email: user.email,
      emailVerifiedAt: user.emailVerifiedAt,
      emailSentAt: record?.emailSentAt ?? null,
      emailFailedAt: record?.emailFailedAt ?? null,
      nextResendAt: record?.nextResendAt ?? new Date(),
      tokenExpiresAt: record?.tokenExpiresAt ?? null,
      reviews: reviews.map(
        ({ id, status, reason, createdAt, decidedAt, reviewerId }) => ({
          id,
          status,
          reason,
          createdAt,
          decidedAt,
          reviewerId,
        }),
      ),
    };
  }

  async resend(userId: string): Promise<VerificationState> {
    const user = await this.verifiableUser(userId);
    if (!user.emailVerifiedAt) {
      await this.ensureCase(user);
      await this.db.transaction(async (manager) => {
        const record = await this.records.findEmailForUpdate(userId, manager);
        if (!record) throw new NotFoundException();
        if (record.nextResendAt > new Date()) {
          throw new HttpException(
            {
              error: 'VERIFICATION_RATE_LIMITED',
              message: 'Espera un minuto antes de solicitar otro correo.',
            },
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }
        await this.issue(record, manager);
      });
      this.outbox.notify();
    }
    return this.status(userId);
  }

  async confirm(token: string): Promise<{ verified: true }> {
    await this.db.transaction(async (manager) => {
      const record = await this.records.findByTokenForUpdate(
        hash(token),
        manager,
      );
      if (
        !record ||
        !record.tokenExpiresAt ||
        record.tokenExpiresAt <= new Date()
      ) {
        throw this.invalidToken();
      }
      const updated = await manager
        .getRepository(User)
        .update(
          { id: record.userId, email: record.email },
          { emailVerifiedAt: new Date() },
        );
      if (!updated.affected) throw this.invalidToken();
      record.tokenHash = null;
      record.tokenNonce = null;
      await this.records.saveEmail(record, manager);
    });
    return { verified: true };
  }

  async submitGuide(
    profile: GuideProfile,
    resubmit: boolean,
    manager: EntityManager,
  ): Promise<CredentialReview> {
    const snapshot: ReviewSnapshot = {
      firstName: profile.user.firstName.trim(),
      lastName: profile.user.lastName.trim(),
      nationalId: profile.nationalId,
      documents: profile.documents
        .map(({ id, type, expiresAt }) => ({ id, type, expiresAt }))
        .sort((a, b) => a.type.localeCompare(b.type)),
    };
    const fingerprint = hash(JSON.stringify(snapshot));
    const latest = await this.records.latestReview(profile.userId, manager);
    if (
      latest?.fingerprint === fingerprint &&
      !(resubmit && latest.status === 'REJECTED')
    ) {
      return latest;
    }
    return this.records.saveReview(
      {
        userId: profile.userId,
        fingerprint,
        snapshot,
        status: 'PENDING',
      },
      manager,
    );
  }

  async decideGuide(
    profile: GuideProfile,
    status: 'APPROVED' | 'REJECTED',
    adminId: string,
    reason: string | undefined,
    manager: EntityManager,
  ): Promise<CredentialReview> {
    if (status === 'APPROVED' && !profile.user.emailVerifiedAt) {
      throw new BadRequestException({
        error: 'EMAIL_NOT_VERIFIED',
        message: 'El guía debe confirmar su correo.',
      });
    }
    const review = await this.submitGuide(profile, false, manager);
    if (review.status !== 'PENDING') {
      if (
        review.status === status &&
        review.reviewerId === adminId &&
        review.reason === (reason ?? null)
      ) {
        return review;
      }
      throw new BadRequestException({
        error: 'REVIEW_ALREADY_DECIDED',
        message: 'El guía debe solicitar una nueva revisión.',
      });
    }
    return this.records.saveReview(
      {
        ...review,
        status,
        reason: reason ?? null,
        reviewerId: adminId,
        decidedAt: new Date(),
      },
      manager,
    );
  }

  private get tokenMinutes(): number {
    return this.config.getOrThrow<number>('EMAIL_TOKEN_MINUTES');
  }

  private invalidToken(): BadRequestException {
    return new BadRequestException({
      error: 'INVALID_VERIFICATION_TOKEN',
      message: 'El enlace no es válido, ya se utilizó o venció.',
    });
  }

  private token(userId: string, nonce: string): string {
    return createHmac('sha256', this.config.getOrThrow<string>('JWT_SECRET'))
      .update(`email-verification:${userId}:${nonce}`)
      .digest('hex');
  }

  private async verifiableUser(userId: string): Promise<User> {
    const user = await this.db.getRepository(User).findOneBy({ id: userId });
    if (!user || !VERIFIABLE_ROLES.includes(user.role)) {
      throw new NotFoundException();
    }
    return user;
  }

  private async ensureCase(user: User): Promise<void> {
    if (await this.records.findEmail(user.id)) return;
    await this.db.transaction(async (manager) => {
      await this.records.lockIdentity(user.id, manager);
      if (await this.records.findEmailForUpdate(user.id, manager)) return;
      await this.enqueue(manager, user);
    });
    this.outbox.notify();
  }

  private async issue(
    record: EmailVerification,
    manager: EntityManager,
  ): Promise<void> {
    const now = Date.now();
    const nonce = randomBytes(32).toString('hex');
    record.tokenNonce = nonce;
    record.tokenHash = hash(this.token(record.userId, nonce));
    record.tokenExpiresAt = new Date(now + this.tokenMinutes * 60_000);
    record.nextResendAt = new Date(
      now + this.config.getOrThrow<number>('EMAIL_RESEND_SECONDS') * 1000,
    );
    record.emailSentAt = null;
    record.emailFailedAt = null;
    await this.records.saveEmail(record, manager);
    await this.outbox.add(manager, {
      topic: 'account.verification',
      key: record.userId,
      payload: { userId: record.userId, nonce },
    });
  }

  private async recordDelivery(
    event: Envelope,
    changes: Pick<Partial<EmailVerification>, 'emailSentAt' | 'emailFailedAt'>,
  ): Promise<void> {
    const { userId, nonce } = event.data;
    if (typeof userId !== 'string' || typeof nonce !== 'string') return;
    await this.records.markDelivery(userId, nonce, changes);
  }
}
