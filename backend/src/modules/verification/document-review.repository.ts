import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { AgencyDocument } from '../agencies/entities/agency-document.entity.js';
import { Agency } from '../agencies/entities/agency.entity.js';
import { GuideDocument } from '../guides/entities/guide-document.entity.js';
import { GuideProfile } from '../guides/entities/guide-profile.entity.js';
import {
  DocumentFinding,
  DocumentRecommendation,
  DocumentReview,
  RequestedDocument,
  ReviewSubject,
} from './entities/document-review.entity.js';

@Injectable()
export class DocumentReviewRepository {
  constructor(
    private readonly db: DataSource,
    @InjectRepository(DocumentReview)
    private readonly reviews: Repository<DocumentReview>,
  ) {}

  findGuide(id: string): Promise<GuideProfile | null> {
    return this.db.getRepository(GuideProfile).findOne({
      where: { id },
      relations: { user: true, documents: true },
    });
  }

  findAgency(id: string): Promise<Agency | null> {
    return this.db.getRepository(Agency).findOne({
      where: { id },
      relations: { user: true, documents: true },
    });
  }

  findDocument(
    subject: ReviewSubject,
    subjectId: string,
    documentId: string,
  ): Promise<GuideDocument | AgencyDocument | null> {
    return subject === 'GUIDE'
      ? this.db
          .getRepository(GuideDocument)
          .findOneBy({ id: documentId, guideProfileId: subjectId })
      : this.db
          .getRepository(AgencyDocument)
          .findOneBy({ id: documentId, agencyId: subjectId });
  }

  findById(id: string): Promise<DocumentReview | null> {
    return this.reviews.findOneBy({ id });
  }

  latest(
    subjectType: ReviewSubject,
    subjectId: string,
  ): Promise<DocumentReview | null> {
    return this.reviews.findOne({
      where: { subjectType, subjectId },
      order: { createdAt: 'DESC', id: 'DESC' },
    });
  }

  create(
    subjectType: ReviewSubject,
    subjectId: string,
    requested: RequestedDocument[],
    manager: EntityManager,
  ): Promise<DocumentReview> {
    const repository = manager.getRepository(DocumentReview);
    return repository.save(
      repository.create({ subjectType, subjectId, requested }),
    );
  }

  async complete(
    id: string,
    recommendation: DocumentRecommendation,
    findings: DocumentFinding[],
  ): Promise<void> {
    await this.reviews
      .createQueryBuilder()
      .update()
      .set({
        status: 'COMPLETED',
        recommendation,
        findings: () => ':findings::jsonb',
        completedAt: new Date(),
      })
      .setParameter('findings', JSON.stringify(findings))
      .where('id = :id AND status = :status', { id, status: 'PENDING' })
      .execute();
  }

  async fail(id: string): Promise<void> {
    await this.reviews.update(
      { id, status: 'PENDING' },
      {
        status: 'FAILED',
        recommendation: 'MANUAL_REVIEW',
        completedAt: new Date(),
      },
    );
  }
}
