import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, QueryFailedError } from 'typeorm';
import { NotificationType } from '../notifications/notifications.enums.js';
import { NotificationsService } from '../notifications/services/notifications.service.js';
import { DocumentReviewRepository } from './document-review.repository.js';
import type {
  RecordInterviewDto,
  ScheduleInterviewDto,
} from './dto/interview.dto.js';
import type { ReviewSubject } from './entities/document-review.entity.js';
import type { ProviderInterview } from './entities/provider-interview.entity.js';
import {
  InterviewRepository,
  InterviewSubject,
} from './interview.repository.js';

const UNIQUE_VIOLATION = '23505';
const BLOCKS: Record<string, string> = {
  INTERVIEW_REQUIRED: 'Registra una entrevista aprobada antes de aprobar.',
  INTERVIEW_PENDING: 'Hay una entrevista agendada sin resultado.',
  INTERVIEW_FAILED:
    'La última entrevista no fue satisfactoria. Agenda otra o rechaza la solicitud.',
  INTERVIEW_AFTER_ALERT:
    'El análisis de los documentos tiene alertas. Registra una nueva entrevista antes de aprobar.',
};

export interface InterviewView {
  id: string;
  scheduledAt: Date;
  modality: ProviderInterview['modality'];
  location: string;
  status: ProviderInterview['status'];
  notes: string | null;
  premisesVisited: boolean | null;
  recordedAt: Date | null;
}

export interface ApprovalState {
  canApprove: boolean;
  reason: string | null;
  message: string | null;
}

@Injectable()
export class InterviewService {
  constructor(
    private readonly db: DataSource,
    private readonly records: InterviewRepository,
    private readonly documentReviews: DocumentReviewRepository,
    private readonly notifications: NotificationsService,
  ) {}

  async overview(subject: ReviewSubject, id: string) {
    const owner = await this.subjectOrFail(subject, id);
    const history = await this.records.history(subject, id);
    return {
      interviews: history.map((item) => this.view(item)),
      approval: await this.approval(owner, history),
      credentialType: owner.credentialType,
    };
  }

  async mine(userId: string): Promise<{ interviews: InterviewView[] }> {
    const owner = await this.records.findSubjectByUser(userId);
    if (!owner) throw new NotFoundException();
    const history = await this.records.history(owner.subject, owner.id);
    return {
      interviews: history
        .filter((item) => item.status === 'SCHEDULED')
        .map((item) => ({ ...this.view(item), notes: null })),
    };
  }

  async schedule(
    subject: ReviewSubject,
    id: string,
    dto: ScheduleInterviewDto,
    adminId: string,
  ): Promise<InterviewView> {
    const owner = await this.subjectOrFail(subject, id);
    const scheduledAt = new Date(dto.scheduledAt);
    if (scheduledAt <= new Date()) {
      throw new BadRequestException({
        error: 'INTERVIEW_DATE_IN_PAST',
        message: 'La entrevista debe agendarse en una fecha futura.',
      });
    }
    const location = dto.location.trim();
    if (dto.modality === 'VIRTUAL' && !this.isMeetingLink(location)) {
      throw new BadRequestException({
        error: 'INVALID_MEETING_LINK',
        message: 'La entrevista virtual necesita un enlace https válido.',
      });
    }
    try {
      const saved = await this.db.transaction(async (manager) => {
        const created = await this.records.create(
          {
            subjectType: subject,
            subjectId: id,
            scheduledAt,
            modality: dto.modality,
            location,
            scheduledById: adminId,
          },
          manager,
        );
        await this.notify(
          manager,
          owner,
          NotificationType.INTERVIEW_SCHEDULED,
          created,
        );
        return created;
      });
      return this.view(saved);
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string }).code === UNIQUE_VIOLATION
      ) {
        throw new ConflictException({
          error: 'INTERVIEW_ALREADY_SCHEDULED',
          message: 'Ya hay una entrevista agendada para este proveedor.',
        });
      }
      throw error;
    }
  }

  async record(
    id: string,
    dto: RecordInterviewDto,
    adminId: string,
  ): Promise<InterviewView> {
    const saved = await this.db.transaction(async (manager) => {
      const interview = await this.openInterview(id, manager);
      const owner = await this.subjectOrFail(
        interview.subjectType,
        interview.subjectId,
      );
      if (dto.result === 'PASSED') {
        if (owner.subject === 'AGENCY' && dto.premisesVisited !== true) {
          throw new BadRequestException({
            error: 'PREMISES_NOT_VISITED',
            message: 'Confirma que verificaste el local de la agencia.',
          });
        }
        if (owner.subject === 'GUIDE') {
          const credentialType = dto.credentialType ?? owner.credentialType;
          if (!credentialType) {
            throw new BadRequestException({
              error: 'CREDENTIAL_TYPE_REQUIRED',
              message: 'Indica si la credencial es SIRETUR o FEBOGUIT.',
            });
          }
          await this.records.setCredentialType(
            owner.id,
            credentialType,
            manager,
          );
        }
      }
      interview.status = dto.result;
      interview.notes = dto.notes.trim();
      interview.premisesVisited =
        owner.subject === 'AGENCY' ? (dto.premisesVisited ?? false) : null;
      interview.recordedById = adminId;
      interview.recordedAt = new Date();
      return this.records.save(interview, manager);
    });
    return this.view(saved);
  }

  async cancel(id: string, adminId: string): Promise<InterviewView> {
    const saved = await this.db.transaction(async (manager) => {
      const interview = await this.openInterview(id, manager);
      const owner = await this.subjectOrFail(
        interview.subjectType,
        interview.subjectId,
      );
      interview.status = 'CANCELLED';
      interview.recordedById = adminId;
      interview.recordedAt = new Date();
      const updated = await this.records.save(interview, manager);
      await this.notify(
        manager,
        owner,
        NotificationType.INTERVIEW_CANCELLED,
        updated,
      );
      return updated;
    });
    return this.view(saved);
  }

  async assertCanApprove(subject: ReviewSubject, id: string): Promise<void> {
    const owner = await this.subjectOrFail(subject, id);
    const state = await this.approval(
      owner,
      await this.records.history(subject, id),
    );
    if (!state.canApprove) {
      throw new ConflictException({
        error: state.reason,
        message: state.message,
      });
    }
  }

  private async approval(
    owner: InterviewSubject,
    history: ProviderInterview[],
  ): Promise<ApprovalState> {
    if (history.some((item) => item.status === 'SCHEDULED')) {
      return this.blocked('INTERVIEW_PENDING');
    }
    const latest = history
      .filter((item) => item.status === 'PASSED' || item.status === 'FAILED')
      .sort(
        (a, b) =>
          (b.recordedAt?.getTime() ?? 0) - (a.recordedAt?.getTime() ?? 0),
      )[0];
    if (latest?.status === 'FAILED') return this.blocked('INTERVIEW_FAILED');
    const review = await this.documentReviews.latest(owner.subject, owner.id);
    const hasAlert = Boolean(
      review?.recommendation && review.recommendation !== 'NO_ALERTS',
    );
    if (latest) {
      return hasAlert && review!.createdAt > latest.recordedAt!
        ? this.blocked('INTERVIEW_AFTER_ALERT')
        : { canApprove: true, reason: null, message: null };
    }
    if (owner.previouslyApproved) {
      return hasAlert
        ? this.blocked('INTERVIEW_AFTER_ALERT')
        : { canApprove: true, reason: null, message: null };
    }
    return this.blocked('INTERVIEW_REQUIRED');
  }

  private blocked(reason: string): ApprovalState {
    return { canApprove: false, reason, message: BLOCKS[reason] };
  }

  private async subjectOrFail(
    subject: ReviewSubject,
    id: string,
  ): Promise<InterviewSubject> {
    const owner = await this.records.findSubject(subject, id);
    if (!owner) throw new NotFoundException();
    return owner;
  }

  private async openInterview(
    id: string,
    manager: EntityManager,
  ): Promise<ProviderInterview> {
    const interview = await this.records.findForUpdate(id, manager);
    if (!interview) throw new NotFoundException();
    if (interview.status !== 'SCHEDULED') {
      throw new ConflictException({
        error: 'INTERVIEW_ALREADY_CLOSED',
        message: 'Esta entrevista ya tiene un resultado o fue cancelada.',
      });
    }
    return interview;
  }

  private isMeetingLink(value: string): boolean {
    try {
      return new URL(value).protocol === 'https:';
    } catch {
      return false;
    }
  }

  private notify(
    manager: EntityManager,
    owner: InterviewSubject,
    type: NotificationType,
    interview: ProviderInterview,
  ): Promise<void> {
    const date = new Intl.DateTimeFormat('es-BO', {
      timeZone: 'America/La_Paz',
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(interview.scheduledAt);
    return this.notifications.notify(manager, owner.userId, type, {
      date,
      modality: interview.modality,
      location: interview.location,
      path: owner.subject === 'GUIDE' ? '/mi-verificacion' : '/panel/perfil',
    });
  }

  private view(item: ProviderInterview): InterviewView {
    return {
      id: item.id,
      scheduledAt: item.scheduledAt,
      modality: item.modality,
      location: item.location,
      status: item.status,
      notes: item.notes,
      premisesVisited: item.premisesVisited,
      recordedAt: item.recordedAt,
    };
  }
}
