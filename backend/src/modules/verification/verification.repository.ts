import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { CredentialReview } from './entities/credential-review.entity.js';
import { EmailVerification } from './entities/email-verification.entity.js';

@Injectable()
export class VerificationRepository {
  constructor(
    @InjectRepository(EmailVerification)
    private readonly emails: Repository<EmailVerification>,
    @InjectRepository(CredentialReview)
    private readonly reviews: Repository<CredentialReview>,
  ) {}

  lockIdentity(userId: string, manager: EntityManager): Promise<unknown> {
    return manager.query(
      'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
      [userId],
    );
  }

  findEmail(userId: string): Promise<EmailVerification | null> {
    return this.emails.findOneBy({ userId });
  }

  findEmailForUpdate(
    userId: string,
    manager: EntityManager,
  ): Promise<EmailVerification | null> {
    return manager
      .getRepository(EmailVerification)
      .findOne({ where: { userId }, lock: { mode: 'pessimistic_write' } });
  }

  findByTokenForUpdate(
    tokenHash: string,
    manager: EntityManager,
  ): Promise<EmailVerification | null> {
    return manager
      .getRepository(EmailVerification)
      .findOne({ where: { tokenHash }, lock: { mode: 'pessimistic_write' } });
  }

  createEmail(
    data: Partial<EmailVerification>,
    manager: EntityManager,
  ): EmailVerification {
    return manager.getRepository(EmailVerification).create(data);
  }

  saveEmail(
    record: EmailVerification,
    manager: EntityManager,
  ): Promise<EmailVerification> {
    return manager.getRepository(EmailVerification).save(record);
  }

  async markDelivery(
    userId: string,
    nonce: string,
    changes: Pick<Partial<EmailVerification>, 'emailSentAt' | 'emailFailedAt'>,
  ): Promise<void> {
    await this.emails.update({ userId, tokenNonce: nonce }, changes);
  }

  listReviews(userId: string): Promise<CredentialReview[]> {
    return this.reviews.find({
      where: { userId },
      order: { createdAt: 'DESC', id: 'DESC' },
    });
  }

  latestReview(
    userId: string,
    manager: EntityManager,
  ): Promise<CredentialReview | null> {
    return manager.getRepository(CredentialReview).findOne({
      where: { userId },
      order: { createdAt: 'DESC', id: 'DESC' },
    });
  }

  saveReview(
    data: Partial<CredentialReview>,
    manager: EntityManager,
  ): Promise<CredentialReview> {
    const repository = manager.getRepository(CredentialReview);
    return repository.save(repository.create(data));
  }
}
