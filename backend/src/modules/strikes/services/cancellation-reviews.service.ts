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
import { StrikeDto } from '../dto/strike.dto.js';
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
import { StrikesRepository } from '../repositories/strikes.repository.js';
import { addMonths, fineFor, SanctionLevel } from '../sanctions.js';
import {
  CancellationDecision,
  CancellationReviewStatus,
  StrikeReason,
} from '../strikes.enums.js';
import { StrikePenaltiesService } from './strike-penalties.service.js';

@Injectable()
export class CancellationReviewsService {
  constructor(
    private readonly reviews: CancellationReviewsRepository,
    private readonly strikes: StrikesRepository,
    private readonly penalties: StrikePenaltiesService,
    private readonly settings: SettingsService,
    private readonly storage: StorageService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async storeEvidence(
    guideProfileId: string,
    file: UploadedFileData | undefined,
  ): Promise<StoredFile | null> {
    if (!file) return null;
    const prepared = prepareDocumentFile(file, undefined);
    return this.storage.save(`cancellations/${guideProfileId}`, prepared);
  }

  async discardEvidence(stored: StoredFile | null): Promise<void> {
    if (stored) await this.storage.remove(stored);
  }

  openForBooking(
    bookingId: string,
    evidence: StoredFile | null,
    manager: EntityManager,
  ): Promise<CancellationReview> {
    return this.reviews.create(
      {
        bookingId,
        evidenceUrl: evidence?.url ?? null,
        evidencePublicId: evidence?.publicId ?? null,
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
    const guideActiveStrikes = review.booking.guideProfileId
      ? await this.strikes.countActiveForGuide(
          review.booking.guideProfileId,
          new Date(),
        )
      : 0;
    return Object.assign(CancellationReviewDto.fromEntity(review), {
      guideActiveStrikes,
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
    const [maxFinePercent, validityMonths] = await Promise.all([
      this.settings.getNumber(SettingKey.MAX_FINE_PERCENT),
      this.settings.getNumber(SettingKey.STRIKE_VALIDITY_MONTHS),
    ]);
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

      review.status = CancellationReviewStatus.RESOLVED;
      review.decision = dto.decision;
      review.fineAmount = withFine
        ? fineFor(review.booking.totalAmount, dto.finePercent!)
        : 0;
      review.resolution = dto.resolution;
      review.resolvedById = adminId;
      review.resolvedAt = now;
      await this.reviews.save(review, manager);

      if (dto.decision === CancellationDecision.NO_SANCTION) {
        const activeStrikes = await this.strikes.countActiveForGuide(
          review.booking.guideProfileId!,
          now,
          manager,
        );
        return { review, strikeId: null, activeStrikes, sanction: null };
      }

      const strike = await this.strikes.create(
        {
          bookingId: review.bookingId,
          reason: StrikeReason.CANCELLED_WITHOUT_WEATHER,
          expiresAt: addMonths(now, validityMonths),
          assignedById: adminId,
        },
        manager,
      );
      const sanction = await this.penalties.apply(
        review.booking.guideProfileId!,
        now,
        manager,
      );
      return {
        review,
        strikeId: strike.id,
        activeStrikes: sanction.activeStrikes,
        sanction,
      };
    });

    const strike = outcome.strikeId
      ? await this.strikes.findById(outcome.strikeId)
      : null;
    return {
      review: CancellationReviewDto.fromEntity(outcome.review),
      strike: strike ? StrikeDto.fromEntity(strike) : null,
      activeStrikes: outcome.activeStrikes,
      sanction: outcome.sanction?.level ?? SanctionLevel.NONE,
      hiddenUntil: outcome.sanction?.hiddenUntil ?? null,
    };
  }

  private async findOrFail(id: string): Promise<CancellationReview> {
    const review = await this.reviews.findById(id);
    if (!review) throw new CancellationReviewNotFoundException();
    return review;
  }
}
