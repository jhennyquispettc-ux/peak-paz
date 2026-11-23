import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Agency } from '../agencies/entities/agency.entity.js';
import { VerificationStatus } from '../../common/enums/verification-status.enum.js';
import { GuideProfile } from '../guides/entities/guide-profile.entity.js';
import type { GuideCredentialType } from '../guides/guides.enums.js';
import type { ReviewSubject } from './entities/document-review.entity.js';
import { ProviderInterview } from './entities/provider-interview.entity.js';

export interface InterviewSubject {
  subject: ReviewSubject;
  id: string;
  userId: string;
  previouslyApproved: boolean;
  credentialType: GuideCredentialType | null;
}

@Injectable()
export class InterviewRepository {
  constructor(
    private readonly db: DataSource,
    @InjectRepository(ProviderInterview)
    private readonly interviews: Repository<ProviderInterview>,
  ) {}

  async findSubject(
    subject: ReviewSubject,
    id: string,
  ): Promise<InterviewSubject | null> {
    if (subject === 'GUIDE') {
      const guide = await this.db.getRepository(GuideProfile).findOneBy({ id });
      return guide && this.guideSubject(guide);
    }
    const agency = await this.db.getRepository(Agency).findOneBy({ id });
    return agency && this.agencySubject(agency);
  }

  async findSubjectByUser(userId: string): Promise<InterviewSubject | null> {
    const guide = await this.db
      .getRepository(GuideProfile)
      .findOneBy({ userId });
    if (guide) return this.guideSubject(guide);
    const agency = await this.db.getRepository(Agency).findOneBy({ userId });
    return agency && this.agencySubject(agency);
  }

  history(
    subjectType: ReviewSubject,
    subjectId: string,
  ): Promise<ProviderInterview[]> {
    return this.interviews.find({
      where: { subjectType, subjectId },
      order: { createdAt: 'DESC', id: 'DESC' },
    });
  }

  findForUpdate(
    id: string,
    manager: EntityManager,
  ): Promise<ProviderInterview | null> {
    return manager
      .getRepository(ProviderInterview)
      .findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
  }

  create(
    data: Partial<ProviderInterview>,
    manager: EntityManager,
  ): Promise<ProviderInterview> {
    const repository = manager.getRepository(ProviderInterview);
    return repository.save(repository.create(data));
  }

  save(
    interview: ProviderInterview,
    manager: EntityManager,
  ): Promise<ProviderInterview> {
    return manager.getRepository(ProviderInterview).save(interview);
  }

  async setCredentialType(
    guideId: string,
    credentialType: GuideCredentialType,
    manager: EntityManager,
  ): Promise<void> {
    await manager
      .getRepository(GuideProfile)
      .update({ id: guideId }, { credentialType });
  }

  private guideSubject(guide: GuideProfile): InterviewSubject {
    return {
      subject: 'GUIDE',
      id: guide.id,
      userId: guide.userId,
      previouslyApproved: guide.firstApprovedAt !== null,
      credentialType: guide.credentialType,
    };
  }

  private agencySubject(agency: Agency): InterviewSubject {
    return {
      subject: 'AGENCY',
      id: agency.id,
      userId: agency.userId,
      previouslyApproved:
        agency.verificationStatus === VerificationStatus.APPROVED,
      credentialType: null,
    };
  }
}
