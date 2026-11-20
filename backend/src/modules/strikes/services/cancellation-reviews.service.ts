import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { PaginationMetaDto } from '../../../common/dto/pagination-meta.dto.js';
import type { UploadedFileData } from '../../../common/types/uploaded-file.js';
import { prepareDocumentFile } from '../../../common/verification/verification-documents.js';
import {
  OpenedFile,
  StorageService,
  StoredFile,
} from '../../../storage/storage.service.js';
import { SettingsService } from '../../settings/services/settings.service.js';
import { SettingKey } from '../../settings/setting-keys.js';
import {
  CancellationResolutionDto,
  CancellationReviewDetailDto,
  CancellationReviewDto,
  CancellationReviewPageDto,
  CancellationReviewQueryDto,
  ResolveCancellationDto,
} from '../dto/cancellation-review.dto.js';
import { CancellationReview } from '../entities/cancellation-review.entity.js';
import {
  CancellationReviewNotFoundException,
  CancellationReviewResolvedException,
  EvidenceNotFoundException,
  FineNotAllowedException,
  FinePercentRequiredException,
  FineTooHighException,
} from '../exceptions/strikes.exceptions.js';
import { CancellationReviewsRepository } from '../repositories/cancellation-reviews.repository.js';
import {
  fineFor,
  ProviderKind,
  SanctionedProvider,
  SanctionLevel,
} from '../sanctions.js';
import {
  CancellationDecision,
  CancellationReviewStatus,
  StrikeReason,
} from '../strikes.enums.js';
import { StrikeIssuerService } from './strike-issuer.service.js';

export interface DepartureReviewData {
  groupDepartureId: string;
  reason: string;
  fineBaseAmount: number;
}

@Injectable()
export class CancellationReviewsService {
  constructor(
    private readonly reviews: CancellationReviewsRepository,
    private readonly issuer: StrikeIssuerService,
    private readonly settings: SettingsService,
    private readonly storage: StorageService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async storeEvidence(
    folder: string,
    file: UploadedFileData | undefined,
  ): Promise<StoredFile | null> {
    if (!file) return null;
    const prepared = prepareDocumentFile(file, undefined);
    return this.storage.save(`cancellations/${folder}`, prepared);
  }

  async discardEvidence(stored: StoredFile | null): Promise<void> {
    if (stored) await this.storage.remove(stored);
  }

  openForBooking(
    booking: { id: string; totalAmount: number },
    evidence: StoredFile | null,
    manager: EntityManager,
  ): Promise<CancellationReview> {
    return this.reviews.create(
      {
        bookingId: booking.id,
        fineBaseAmount: booking.totalAmount,
        ...this.evidenceColumns(evidence),
      },
      manager,
    );
  }

  openForDeparture(
    data: DepartureReviewData,
    evidence: StoredFile | null,
    manager: EntityManager,
  ): Promise<CancellationReview> {
    return this.reviews.create(
      {
        groupDepartureId: data.groupDepartureId,
        reason: data.reason,
        fineBaseAmount: data.fineBaseAmount,
        ...this.evidenceColumns(evidence),
      },
      manager,
    );
  }

  async list(
    query: CancellationReviewQueryDto,
  ): Promise<CancellationReviewPageDto> {
    const [reviews, total] = await this.reviews.findPage({
      skip: query.skip,
      take: query.limit,
      status: query.status,
    });
    return {
      data: reviews.map((review) => CancellationReviewDto.fromEntity(review)),
      meta: PaginationMetaDto.of(query.page, query.limit, total),
    };
  }

  async get(id: string): Promise<CancellationReviewDetailDto> {
    const review = await this.findOrFail(id);
    const activeStrikes = await this.issuer.countActive(
      this.providerOf(review),
      new Date(),
    );
    return Object.assign(CancellationReviewDto.fromEntity(review), {
      activeStrikes,
    });
  }

  async openEvidence(id: string): Promise<OpenedFile> {
    const review = await this.findOrFail(id);
    if (!review.evidenceUrl || !review.evidencePublicId) {
      throw new EvidenceNotFoundException();
    }
    return this.storage.open({
      url: review.evidenceUrl,
      publicId: review.evidencePublicId,
    });
  }

  async resolve(
    adminId: string,
    id: string,
    dto: ResolveCancellationDto,
  ): Promise<CancellationResolutionDto> {
    const withFine = dto.decision === CancellationDecision.STRIKE_AND_FINE;
    if (withFine && dto.finePercent === undefined) {
      throw new FinePercentRequiredException();
    }
    if (!withFine && dto.finePercent !== undefined) {
      throw new FineNotAllowedException();
    }
    const maxFinePercent = await this.settings.getNumber(
      SettingKey.MAX_FINE_PERCENT,
    );
    if (withFine && dto.finePercent! > maxFinePercent) {
      throw new FineTooHighException(maxFinePercent);
    }

    const outcome = await this.dataSource.transaction(async (manager) => {
      await this.reviews.lockById(id, manager);
      const review = await this.reviews.findById(id, manager);
      if (!review) throw new CancellationReviewNotFoundException();
      if (review.status !== CancellationReviewStatus.PENDING) {
        throw new CancellationReviewResolvedException();
      }
      const now = new Date();
      const provider = this.providerOf(review);

      review.status = CancellationReviewStatus.RESOLVED;
      review.decision = dto.decision;
      review.fineAmount = withFine
        ? fineFor(review.fineBaseAmount, dto.finePercent!)
        : 0;
      review.resolution = dto.resolution;
      review.resolvedById = adminId;
      review.resolvedAt = now;
      await this.reviews.save(review, manager);

      if (dto.decision === CancellationDecision.NO_SANCTION) {
        const activeStrikes = await this.issuer.countActive(
          provider,
          now,
          manager,
        );
        return { review, strikeId: null, activeStrikes, sanction: null };
      }

      const issued = await this.issuer.issue(
        {
          provider,
          subjectId: review.bookingId ?? review.groupDepartureId!,
          reason: StrikeReason.CANCELLED_WITHOUT_WEATHER,
          weight: 1,
          adminId,
        },
        now,
        manager,
      );
      return {
        review,
        strikeId: issued.strikeId,
        activeStrikes: issued.sanction.activeStrikes,
        sanction: issued.sanction,
      };
    });

    return {
      review: CancellationReviewDto.fromEntity(outcome.review),
      strike: outcome.strikeId
        ? await this.issuer.findDto(outcome.strikeId)
        : null,
      activeStrikes: outcome.activeStrikes,
      sanction: outcome.sanction?.level ?? SanctionLevel.NONE,
      hiddenUntil: outcome.sanction?.hiddenUntil ?? null,
    };
  }

  private providerOf(review: CancellationReview): SanctionedProvider {
    return review.groupDeparture
      ? { kind: ProviderKind.AGENCY, id: review.groupDeparture.agencyId }
      : { kind: ProviderKind.GUIDE, id: review.booking!.guideProfileId! };
  }

  private evidenceColumns(evidence: StoredFile | null) {
    return {
      evidenceUrl: evidence?.url ?? null,
      evidencePublicId: evidence?.publicId ?? null,
    };
  }

  private async findOrFail(id: string): Promise<CancellationReview> {
    const review = await this.reviews.findById(id);
    if (!review) throw new CancellationReviewNotFoundException();
    return review;
  }
}
