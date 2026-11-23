import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnOutboxMessage, Outbox } from '@nestjs/outbox';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { DataSource, EntityManager } from 'typeorm';
import { missingDocumentTypes } from '../../common/verification/verification-documents.js';
import { OpenedFile, StorageService } from '../../storage/storage.service.js';
import {
  AgencyDocumentType,
  REQUIRED_AGENCY_DOCUMENTS,
} from '../agencies/agencies.enums.js';
import { REQUIRED_GUIDE_DOCUMENTS } from '../guides/guides.enums.js';
import {
  DOCUMENT_REVIEW_FAILED_TYPE,
  DOCUMENT_REVIEW_TYPE,
  DOCUMENT_REVIEWED_TYPE,
  Envelope,
} from '../messaging/messaging.contracts.js';
import { MessagingService } from '../messaging/messaging.service.js';
import { DocumentReviewRepository } from './document-review.repository.js';
import type {
  DocumentFinding,
  DocumentRecommendation,
  DocumentReview,
  RequestedDocument,
  ReviewSubject,
} from './entities/document-review.entity.js';

const FILE_LINK_SECONDS = 15 * 60;
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RECOMMENDATIONS: DocumentRecommendation[] = [
  'NO_ALERTS',
  'HAS_ALERTS',
  'MANUAL_REVIEW',
];

export interface DocumentReviewView {
  id: string;
  status: DocumentReview['status'];
  recommendation: DocumentRecommendation | null;
  documents: DocumentFinding[];
  createdAt: Date;
  completedAt: Date | null;
}

@Injectable()
export class DocumentReviewService implements OnModuleInit {
  private readonly logger = new Logger(DocumentReviewService.name);

  constructor(
    private readonly db: DataSource,
    private readonly records: DocumentReviewRepository,
    private readonly messaging: MessagingService,
    private readonly storage: StorageService,
    private readonly config: ConfigService,
    private readonly outbox: Outbox<EntityManager>,
  ) {}

  onModuleInit(): void {
    this.messaging.onEvent(DOCUMENT_REVIEWED_TYPE, (event) =>
      this.onReviewed(event),
    );
    this.messaging.onEvent(DOCUMENT_REVIEW_FAILED_TYPE, async (event) => {
      const { reviewId } = event.data;
      if (typeof reviewId === 'string' && UUID.test(reviewId)) {
        await this.records.fail(reviewId);
      }
    });
  }

  async requestAfterUpload(
    subject: ReviewSubject,
    subjectId: string,
  ): Promise<void> {
    try {
      await this.request(subject, subjectId);
    } catch (error) {
      this.logger.warn(
        `Document review not requested for ${subjectId}: ${(error as Error).message}`,
      );
    }
  }

  async request(
    subject: ReviewSubject,
    subjectId: string,
  ): Promise<DocumentReviewView> {
    const requested = await this.documentsOf(subject, subjectId);
    const review = await this.db.transaction(async (manager) => {
      const created = await this.records.create(
        subject,
        subjectId,
        requested,
        manager,
      );
      await this.outbox.add(manager, {
        topic: 'document.review',
        key: subjectId,
        payload: { reviewId: created.id },
      });
      return created;
    });
    this.outbox.notify();
    return this.view(review);
  }

  async latest(
    subject: ReviewSubject,
    subjectId: string,
  ): Promise<{ review: DocumentReviewView | null }> {
    const review = await this.records.latest(subject, subjectId);
    return { review: review ? this.view(review) : null };
  }

  @OnOutboxMessage('document.review', { consumer: 'document-review' })
  async deliver({ reviewId }: { reviewId: string }): Promise<void> {
    const review = await this.records.findById(reviewId);
    if (review?.status !== 'PENDING') return;
    const base = this.config.getOrThrow<string>('DOCUMENT_BASE_URL');
    await this.messaging.sendCommand(DOCUMENT_REVIEW_TYPE, {
      reviewId,
      documents: review.requested.map(({ id, type, expectedName }) => ({
        id,
        type,
        expectedName,
        url: new URL(
          `/api/internal/document-files/${this.signFile(reviewId, id)}`,
          base,
        ).toString(),
      })),
    });
  }

  async openFile(token: string): Promise<OpenedFile> {
    const claims = this.readFileToken(token);
    const review = claims && (await this.records.findById(claims.reviewId));
    if (
      !claims ||
      review?.status !== 'PENDING' ||
      !review.requested.some((document) => document.id === claims.documentId)
    ) {
      throw new NotFoundException({
        error: 'FILE_NOT_FOUND',
        message: 'The stored file could not be found.',
      });
    }
    const document = await this.records.findDocument(
      review.subjectType,
      review.subjectId,
      claims.documentId,
    );
    if (!document) {
      throw new NotFoundException({
        error: 'FILE_NOT_FOUND',
        message: 'The stored file could not be found.',
      });
    }
    return this.storage.open(document);
  }

  private async documentsOf(
    subject: ReviewSubject,
    subjectId: string,
  ): Promise<RequestedDocument[]> {
    if (subject === 'GUIDE') {
      const profile = await this.records.findGuide(subjectId);
      if (!profile) throw new NotFoundException();
      this.assertComplete(
        missingDocumentTypes(REQUIRED_GUIDE_DOCUMENTS, profile.documents),
      );
      const name = `${profile.user.firstName} ${profile.user.lastName}`;
      return profile.documents
        .filter((document) =>
          (REQUIRED_GUIDE_DOCUMENTS as readonly string[]).includes(
            document.type,
          ),
        )
        .map(({ id, type }) => ({ id, type, expectedName: name }));
    }
    const agency = await this.records.findAgency(subjectId);
    if (!agency) throw new NotFoundException();
    this.assertComplete(
      missingDocumentTypes(REQUIRED_AGENCY_DOCUMENTS, agency.documents),
    );
    const representative = `${agency.user.firstName} ${agency.user.lastName}`;
    return agency.documents
      .filter((document) =>
        (REQUIRED_AGENCY_DOCUMENTS as readonly string[]).includes(
          document.type,
        ),
      )
      .map(({ id, type }) => ({
        id,
        type,
        expectedName:
          type === AgencyDocumentType.REPRESENTATIVE_ID
            ? representative
            : agency.legalName,
      }));
  }

  private assertComplete(missing: string[]): void {
    if (missing.length) {
      throw new ConflictException({
        error: 'DOCUMENTS_INCOMPLETE',
        message: 'Faltan documentos o alguno está vencido.',
        missing,
      });
    }
  }

  private async onReviewed(event: Envelope): Promise<void> {
    const { reviewId, recommendation, documents } = event.data;
    if (
      typeof reviewId !== 'string' ||
      !UUID.test(reviewId) ||
      !RECOMMENDATIONS.includes(recommendation as DocumentRecommendation) ||
      !Array.isArray(documents)
    ) {
      throw new Error('Invalid document review event');
    }
    const findings = (documents as DocumentFinding[]).map((item) => ({
      documentId: String(item.documentId),
      type: String(item.type),
      readable: Boolean(item.readable),
      confidence: Number(item.confidence),
      nameScore: item.nameScore === null ? null : Number(item.nameScore),
      alerts: Array.isArray(item.alerts) ? item.alerts.map(String) : [],
    }));
    await this.records.complete(
      reviewId,
      recommendation as DocumentRecommendation,
      findings,
    );
  }

  private view(review: DocumentReview): DocumentReviewView {
    return {
      id: review.id,
      status: review.status,
      recommendation: review.recommendation,
      documents: review.findings ?? [],
      createdAt: review.createdAt,
      completedAt: review.completedAt,
    };
  }

  private signature(payload: string): Buffer {
    return createHmac('sha256', this.config.getOrThrow<string>('JWT_SECRET'))
      .update(`document-file:${payload}`)
      .digest();
  }

  private signFile(reviewId: string, documentId: string): string {
    const expires = Math.floor(Date.now() / 1000) + FILE_LINK_SECONDS;
    const payload = `${reviewId}.${documentId}.${expires}`;
    return `${payload}.${this.signature(payload).toString('base64url')}`;
  }

  private readFileToken(
    token: string,
  ): { reviewId: string; documentId: string } | null {
    const [reviewId, documentId, expires, signature, ...rest] =
      token.split('.');
    if (
      rest.length ||
      !UUID.test(reviewId ?? '') ||
      !UUID.test(documentId ?? '') ||
      !/^\d{1,12}$/.test(expires ?? '') ||
      !signature
    ) {
      return null;
    }
    const expected = this.signature(`${reviewId}.${documentId}.${expires}`);
    const received = Buffer.from(signature, 'base64url');
    if (
      received.length !== expected.length ||
      !timingSafeEqual(received, expected) ||
      Number(expires) < Date.now() / 1000
    ) {
      return null;
    }
    return { reviewId, documentId };
  }
}
