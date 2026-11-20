import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { html, Mailer } from '@nestjs/mail';
import {
  OnOutboxMessage,
  Outbox,
  type OutboxHandlerContext,
} from '@nestjs/outbox';
import { createHash, createHmac, randomBytes } from 'node:crypto';
import { DataSource, EntityManager } from 'typeorm';
import { DecideReviewDto, OpenCaseDto, SubmitReviewDto } from './dto.js';
import {
  CredentialReview,
  VerificationCase,
  type ReviewSnapshot,
} from './entities.js';

const hash = (value: string) =>
  createHash('sha256').update(value).digest('hex');
const fail = (code: string, message: string) =>
  new BadRequestException({ error: code, message });

@Injectable()
export class VerificationService {
  constructor(
    private readonly db: DataSource,
    private readonly config: ConfigService,
    private readonly outbox: Outbox<EntityManager>,
    private readonly mailer: Mailer,
  ) {}

  async open(dto: OpenCaseDto) {
    await this.db.transaction(async (manager) => {
      // Serialize first registration and retries, including across service instances.
      await manager.query(
        'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
        [dto.userId],
      );
      const repository = manager.getRepository(VerificationCase);
      const existing = await repository.findOneBy({ userId: dto.userId });
      if (existing) {
        if (existing.email !== dto.email || existing.role !== dto.role) {
          throw new ConflictException(
            'Verification identity cannot be replaced',
          );
        }
        return;
      }
      const record = repository.create({
        userId: dto.userId,
        email: dto.email,
        firstName: dto.firstName,
        role: dto.role,
        emailVerifiedAt: null,
        emailSentAt: null,
      });
      await this.issue(record, manager);
    });
    this.outbox.notify();
    return this.status(dto.userId);
  }

  async status(userId: string) {
    const record = await this.db
      .getRepository(VerificationCase)
      .findOneBy({ userId });
    if (!record) throw new NotFoundException('Verification case not found');
    const reviews = await this.db
      .getRepository(CredentialReview)
      .find({ where: { userId }, order: { createdAt: 'DESC', id: 'DESC' } });
    // No tokens, hashes, nonces or internal delivery payloads leave this service.
    return {
      userId,
      email: record.email,
      emailVerifiedAt: record.emailVerifiedAt,
      emailSentAt: record.emailSentAt,
      nextResendAt: record.nextResendAt,
      tokenExpiresAt: record.tokenExpiresAt,
      reviews,
    };
  }

  async resend(userId: string) {
    await this.db.transaction(async (manager) => {
      const record = await manager
        .getRepository(VerificationCase)
        .findOne({ where: { userId }, lock: { mode: 'pessimistic_write' } });
      if (!record) throw new NotFoundException();
      if (record.emailVerifiedAt) return;
      if (record.nextResendAt > new Date()) {
        throw new HttpException(
          {
            error: 'VERIFICATION_RATE_LIMITED',
            message: 'Espera un minuto antes de solicitar otro correo.',
          },
          429,
        );
      }
      await this.issue(record, manager);
    });
    this.outbox.notify();
    return this.status(userId);
  }

  async confirm(token: string) {
    return this.db.transaction(async (manager) => {
      const repository = manager.getRepository(VerificationCase);
      const record = await repository.findOne({
        where: { tokenHash: hash(token) },
        lock: { mode: 'pessimistic_write' },
      });
      if (
        !record ||
        record.emailVerifiedAt ||
        !record.tokenExpiresAt ||
        record.tokenExpiresAt <= new Date()
      ) {
        throw fail(
          'INVALID_VERIFICATION_TOKEN',
          'El enlace no es válido, ya se utilizó o venció.',
        );
      }
      record.emailVerifiedAt = new Date();
      record.tokenHash = null;
      record.tokenNonce = null;
      await repository.save(record);
      return {
        userId: record.userId,
        email: record.email,
        emailVerifiedAt: record.emailVerifiedAt,
      };
    });
  }

  private token(record: VerificationCase): string {
    return createHmac(
      'sha256',
      this.config.getOrThrow<string>('EMAIL_TOKEN_SECRET'),
    )
      .update(`${record.userId}:${record.tokenNonce}`)
      .digest('hex');
  }

  private async issue(record: VerificationCase, manager: EntityManager) {
    record.tokenNonce = randomBytes(32).toString('hex');
    record.tokenHash = hash(this.token(record));
    record.tokenExpiresAt = new Date(
      Date.now() +
        this.config.getOrThrow<number>('EMAIL_TOKEN_MINUTES') * 60_000,
    );
    record.nextResendAt = new Date(
      Date.now() +
        this.config.getOrThrow<number>('EMAIL_RESEND_SECONDS') * 1000,
    );
    record.emailSentAt = null;
    await manager.getRepository(VerificationCase).save(record);
    await this.outbox.add(manager, {
      topic: 'verification.email',
      key: record.userId,
      payload: { userId: record.userId, nonce: record.tokenNonce },
    });
  }

  @OnOutboxMessage('verification.email', {
    consumer: 'verification-email-sender',
  })
  async deliverEmail(
    payload: { userId: string; nonce: string },
    context: OutboxHandlerContext,
  ) {
    const record = await this.db
      .getRepository(VerificationCase)
      .findOneBy({ userId: payload.userId });
    if (
      !record ||
      record.emailVerifiedAt ||
      record.tokenNonce !== payload.nonce ||
      !record.tokenExpiresAt ||
      record.tokenExpiresAt <= new Date()
    )
      return;
    const link = new URL(
      '/verificar-correo',
      this.config.getOrThrow<string>('PUBLIC_WEB_URL'),
    );
    // A fragment keeps the token out of HTTP access logs and Referer headers.
    link.hash = `token=${this.token(record)}`;
    await this.mailer.send({
      to: { address: record.email, name: record.firstName },
      subject: 'Confirma tu correo en Peak Paz',
      html: html`<h1>Tu siguiente camino empieza aquí</h1>
        <p>Hola, ${record.firstName}.</p>
        <p>Confirma tu correo para completar tu cuenta en Peak Paz.</p>
        <p><a href="${link.toString()}">Confirmar mi correo</a></p>
        <p>
          Este enlace vence en
          ${this.config.getOrThrow<number>('EMAIL_TOKEN_MINUTES')} minutos y
          solo se puede utilizar una vez. Si no creaste esta cuenta, puedes
          ignorar este mensaje.
        </p>`,
      idempotencyKey: context.message.id,
      signal: context.signal,
      retry: false,
    });
    await this.db
      .getRepository(VerificationCase)
      .update(
        { userId: payload.userId, tokenNonce: payload.nonce },
        { emailSentAt: new Date() },
      );
  }

  async submit(userId: string, dto: SubmitReviewDto, resubmit = false) {
    const snapshot: ReviewSnapshot = {
      firstName: dto.firstName.trim(),
      lastName: dto.lastName.trim(),
      nationalId: dto.nationalId,
      documents: [...dto.documents].sort((a, b) =>
        a.type.localeCompare(b.type),
      ),
    };
    const fingerprint = hash(JSON.stringify(snapshot));
    return this.db.transaction(async (manager) => {
      const account = await manager
        .getRepository(VerificationCase)
        .findOne({ where: { userId }, lock: { mode: 'pessimistic_write' } });
      if (!account || account.role !== 'GUIDE') throw new NotFoundException();
      const repository = manager.getRepository(CredentialReview);
      const latest = await repository.findOne({
        where: { userId },
        order: { createdAt: 'DESC', id: 'DESC' },
      });
      if (
        latest?.fingerprint === fingerprint &&
        !(resubmit && latest.status === 'REJECTED')
      )
        return latest;
      return repository.save(
        repository.create({
          userId,
          fingerprint,
          snapshot,
          status: 'PENDING',
          reason: null,
          reviewerId: null,
          decidedAt: null,
        }),
      );
    });
  }

  async decide(userId: string, reviewId: string, dto: DecideReviewDto) {
    return this.db.transaction(async (manager) => {
      const account = await manager
        .getRepository(VerificationCase)
        .findOne({ where: { userId }, lock: { mode: 'pessimistic_write' } });
      if (!account || account.role !== 'GUIDE') throw new NotFoundException();
      const repository = manager.getRepository(CredentialReview);
      const review = await repository.findOneBy({ id: reviewId, userId });
      if (!review) throw new NotFoundException();
      const latest = await repository.findOne({
        where: { userId },
        order: { createdAt: 'DESC', id: 'DESC' },
      });
      if (latest?.id !== reviewId)
        throw new ConflictException('Review has been superseded');
      if (review.status !== 'PENDING') {
        if (
          review.status === dto.status &&
          review.reviewerId === dto.reviewerId &&
          review.reason === (dto.reason ?? null)
        )
          return review;
        throw new ConflictException('Review has already been decided');
      }
      if (dto.status === 'APPROVED') {
        if (!account.emailVerifiedAt)
          throw fail('EMAIL_NOT_VERIFIED', 'El guía debe confirmar su correo.');
        const today = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'America/La_Paz',
        }).format(new Date());
        const missing = ['NATIONAL_ID', 'GUIDE_CREDENTIAL', 'FIRST_AID'].filter(
          (type) =>
            !review.snapshot.documents.some(
              (document) =>
                document.type === type &&
                (!document.expiresAt || document.expiresAt >= today),
            ),
        );
        if (missing.length)
          throw fail(
            'DOCUMENTS_INCOMPLETE',
            'Faltan documentos vigentes: ' + missing.join(', '),
          );
      }
      Object.assign(review, {
        status: dto.status,
        reason: dto.reason ?? null,
        reviewerId: dto.reviewerId,
        decidedAt: new Date(),
      });
      return repository.save(review);
    });
  }
}
