import { AccountVerificationService } from '../../verification/verification.service.js';
import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { VerificationDocumentDto } from '../../../common/dto/verification-document.dto.js';
import { VerificationStatus } from '../../../common/enums/verification-status.enum.js';
import {
  DocumentNotFoundException,
  DocumentsIncompleteException,
  ProfileLockedException,
  ProviderNotApprovedException,
  ReviewNotAvailableException,
} from '../../../common/exceptions/verification.exceptions.js';
import type { UploadedFileData } from '../../../common/types/uploaded-file.js';
import {
  missingDocumentTypes,
  prepareDocumentFile,
} from '../../../common/verification/verification-documents.js';
import {
  OpenedFile,
  StorageService,
} from '../../../storage/storage.service.js';
import { RouteNotFoundException } from '../../routes/exceptions/routes.exceptions.js';
import { RoutesRepository } from '../../routes/repositories/routes.repository.js';
import { User } from '../../users/entities/user.entity.js';
import { DocumentReviewService } from '../../verification/document-review.service.js';
import { GuideProfileDto } from '../dto/guide-profile.dto.js';
import { GuideRouteDto } from '../dto/guide-route.dto.js';
import { RegisterGuideDto } from '../dto/register-guide.dto.js';
import { UpdateGuideProfileDto } from '../dto/update-guide-profile.dto.js';
import { UploadGuideDocumentDto } from '../dto/upload-guide-document.dto.js';
import { GuideDocument } from '../entities/guide-document.entity.js';
import { GuideProfile } from '../entities/guide-profile.entity.js';
import { GuideRoute } from '../entities/guide-route.entity.js';
import {
  GuideNotFoundException,
  GuideRouteAlreadyRequestedException,
  GuideRouteNotFoundException,
} from '../exceptions/guides.exceptions.js';
import {
  GuideDocumentType,
  REQUIRED_GUIDE_DOCUMENTS,
} from '../guides.enums.js';
import { GuidesRepository } from '../repositories/guides.repository.js';

@Injectable()
export class GuideProfilesService {
  constructor(
    private readonly db: DataSource,
    private readonly accountVerification: AccountVerificationService,
    private readonly guides: GuidesRepository,
    @InjectRepository(GuideDocument)
    private readonly documents: Repository<GuideDocument>,
    @InjectRepository(GuideRoute)
    private readonly guideRoutes: Repository<GuideRoute>,
    private readonly routes: RoutesRepository,
    private readonly storage: StorageService,
    private readonly documentReviews: DocumentReviewService,
  ) {}

  createForUser(
    manager: EntityManager,
    user: User,
    dto: RegisterGuideDto,
  ): Promise<GuideProfile> {
    const profile = this.guides.create(
      {
        userId: user.id,
        nationalId: dto.nationalId,
        languages: dto.languages,
        yearsExperience: dto.yearsExperience,
        bioEs: dto.bioEs ?? null,
        bioEn: dto.bioEn ?? null,
        verificationStatus: VerificationStatus.PENDING,
      },
      manager,
    );
    return this.guides.save(profile, manager);
  }

  async getMine(userId: string): Promise<GuideProfileDto> {
    return GuideProfileDto.fromEntity(await this.findMine(userId));
  }

  async updateMine(
    userId: string,
    dto: UpdateGuideProfileDto,
  ): Promise<GuideProfileDto> {
    await this.db.transaction(async (manager) => {
      const profile = await manager
        .getRepository(GuideProfile)
        .findOne({ where: { userId }, lock: { mode: 'pessimistic_write' } });
      if (!profile) throw new GuideNotFoundException();
      const changesIdentity =
        dto.nationalId !== undefined && dto.nationalId !== profile.nationalId;
      if (
        changesIdentity &&
        profile.verificationStatus === VerificationStatus.APPROVED
      )
        throw new ProfileLockedException();
      Object.assign(profile, dto);
      await manager.getRepository(GuideProfile).save(profile);
    });
    return this.getMine(userId);
  }

  async uploadDocument(
    userId: string,
    dto: UploadGuideDocumentDto,
    file: UploadedFileData | undefined,
  ): Promise<VerificationDocumentDto> {
    const prepared = prepareDocumentFile(file, dto.expiresAt);
    const profile = await this.findMine(userId);
    const previous = profile.documents.filter(
      (document) => document.type === dto.type,
    );

    const stored = await this.storage.save(`guides/${profile.id}`, prepared);
    let saved: GuideDocument;
    try {
      saved = await this.db.transaction(async (manager) => {
        await manager
          .getRepository(GuideProfile)
          .findOne({
            where: { id: profile.id },
            lock: { mode: 'pessimistic_write' },
          });
        const current = await manager
          .getRepository(GuideDocument)
          .findBy({ guideProfileId: profile.id, type: dto.type });
        previous.splice(0, previous.length, ...current);
        await manager
          .getRepository(GuideDocument)
          .delete({ guideProfileId: profile.id, type: dto.type });
        await manager
          .getRepository(GuideProfile)
          .createQueryBuilder()
          .update()
          .set({
            verificationStatus: VerificationStatus.PENDING,
            verifiedAt: null,
            verifiedById: null,
            rejectionReason: null,
          })
          .where('id = :id AND verification_status = :status', {
            id: profile.id,
            status: VerificationStatus.APPROVED,
          })
          .execute();
        if (
          dto.type === GuideDocumentType.GUIDE_CREDENTIAL &&
          dto.credentialType
        ) {
          await manager
            .getRepository(GuideProfile)
            .update({ id: profile.id }, { credentialType: dto.credentialType });
        }
        return manager.getRepository(GuideDocument).save(
          manager.getRepository(GuideDocument).create({
            guideProfileId: profile.id,
            type: dto.type,
            expiresAt: dto.expiresAt ?? null,
            url: stored.url,
            publicId: stored.publicId,
          }),
        );
      });
    } catch (error) {
      await this.storage.remove(stored);
      throw error;
    }

    for (const document of previous) {
      await this.storage.remove(document);
    }
    const current = await this.findMine(userId);
    if (
      missingDocumentTypes(REQUIRED_GUIDE_DOCUMENTS, current.documents)
        .length === 0
    ) {
      await this.documentReviews.requestAfterUpload('GUIDE', profile.id);
    }
    return VerificationDocumentDto.fromEntity(saved);
  }

  async removeDocument(userId: string, documentId: string): Promise<void> {
    const document = await this.findMyDocument(userId, documentId);
    await this.db.transaction(async (manager) => {
      await manager
        .getRepository(GuideProfile)
        .findOne({
          where: { id: document.guideProfileId },
          lock: { mode: 'pessimistic_write' },
        });
      await manager.getRepository(GuideDocument).delete({ id: document.id });
      await manager
        .getRepository(GuideProfile)
        .createQueryBuilder()
        .update()
        .set({
          verificationStatus: VerificationStatus.PENDING,
          verifiedAt: null,
          verifiedById: null,
          rejectionReason: null,
        })
        .where('id = :id AND verification_status = :status', {
          id: document.guideProfileId,
          status: VerificationStatus.APPROVED,
        })
        .execute();
    });
    await this.storage.remove(document);
  }

  async openDocument(userId: string, documentId: string): Promise<OpenedFile> {
    return this.storage.open(await this.findMyDocument(userId, documentId));
  }

  async requestReview(userId: string): Promise<GuideProfileDto> {
    await this.db.transaction(async (manager) => {
      const locked = await manager
        .getRepository(GuideProfile)
        .findOne({ where: { userId }, lock: { mode: 'pessimistic_write' } });
      if (!locked) throw new GuideNotFoundException();
      const profile = await manager
        .getRepository(GuideProfile)
        .findOneOrFail({
          where: { userId },
          relations: { user: true, documents: true },
        });
      if (profile.verificationStatus === VerificationStatus.APPROVED)
        throw new ReviewNotAvailableException();
      if (!profile.user.emailVerifiedAt)
        throw new ForbiddenException({
          error: 'EMAIL_NOT_VERIFIED',
          message: 'Confirma tu correo antes de solicitar una revisión.',
        });
      const missing = missingDocumentTypes(
        REQUIRED_GUIDE_DOCUMENTS,
        profile.documents,
      );
      if (missing.length) throw new DocumentsIncompleteException(missing);
      await this.accountVerification.submitGuide(
        profile,
        profile.verificationStatus === VerificationStatus.REJECTED,
        manager,
      );
      profile.verificationStatus = VerificationStatus.PENDING;
      profile.rejectionReason = null;
      await manager.getRepository(GuideProfile).save(profile);
    });
    return this.getMine(userId);
  }

  async requestRoute(userId: string, routeId: string): Promise<GuideRouteDto> {
    const profile = await this.findMine(userId);
    if (
      !profile.user.emailVerifiedAt ||
      profile.verificationStatus !== VerificationStatus.APPROVED ||
      missingDocumentTypes(REQUIRED_GUIDE_DOCUMENTS, profile.documents).length >
        0
    ) {
      throw new ProviderNotApprovedException();
    }
    const route = await this.routes.findById(routeId);
    if (!route?.isPublished) throw new RouteNotFoundException();

    const existing = await this.guideRoutes.findOne({
      where: { guideProfileId: profile.id, routeId },
    });
    if (existing && existing.status !== VerificationStatus.REJECTED) {
      throw new GuideRouteAlreadyRequestedException();
    }

    const guideRoute =
      existing ??
      this.guideRoutes.create({ guideProfileId: profile.id, routeId });
    guideRoute.status = VerificationStatus.PENDING;
    guideRoute.reviewedById = null;
    guideRoute.reviewedAt = null;
    const saved = await this.guideRoutes.save(guideRoute);
    saved.route = route;
    return GuideRouteDto.fromEntity(saved);
  }

  async withdrawRoute(userId: string, routeId: string): Promise<void> {
    const profile = await this.findMineWithoutRelations(userId);
    const result = await this.guideRoutes.delete({
      guideProfileId: profile.id,
      routeId,
    });
    if (!result.affected) throw new GuideRouteNotFoundException();
  }

  private async findMine(userId: string): Promise<GuideProfile> {
    const profile = await this.guides.findByUserId(userId);
    if (!profile) throw new GuideNotFoundException();
    return profile;
  }

  private async findMineWithoutRelations(
    userId: string,
  ): Promise<GuideProfile> {
    const profile = await this.guides.findIdByUserId(userId);
    if (!profile) throw new GuideNotFoundException();
    return profile;
  }

  private async findMyDocument(
    userId: string,
    documentId: string,
  ): Promise<GuideDocument> {
    const profile = await this.findMineWithoutRelations(userId);
    const document = await this.documents.findOne({
      where: { id: documentId, guideProfileId: profile.id },
    });
    if (!document) throw new DocumentNotFoundException();
    return document;
  }
}
