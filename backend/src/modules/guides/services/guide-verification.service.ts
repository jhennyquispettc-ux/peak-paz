import { DataSource } from 'typeorm';
import { AccountVerificationService } from '../../verification/verification.service.js';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginationMetaDto } from '../../../common/dto/pagination-meta.dto.js';
import { VerificationDecisionDto } from '../../../common/dto/verification-decision.dto.js';
import { VerificationQueryDto } from '../../../common/dto/verification-query.dto.js';
import { VerificationStatus } from '../../../common/enums/verification-status.enum.js';
import {
  DocumentNotFoundException,
  DocumentsIncompleteException,
  ProviderNotApprovedException,
} from '../../../common/exceptions/verification.exceptions.js';
import { missingDocumentTypes } from '../../../common/verification/verification-documents.js';
import {
  OpenedFile,
  StorageService,
} from '../../../storage/storage.service.js';
import { GuideProfileDto } from '../dto/guide-profile.dto.js';
import {
  GuideRouteRequestDto,
  GuideRouteRequestPageDto,
  GuideRouteRequestQueryDto,
} from '../dto/guide-route-request.dto.js';
import { GuidePageDto, GuideSummaryDto } from '../dto/guide-summary.dto.js';
import { GuideDocument } from '../entities/guide-document.entity.js';
import { GuideProfile } from '../entities/guide-profile.entity.js';
import { GuideRoute } from '../entities/guide-route.entity.js';
import {
  GuideNotFoundException,
  GuideRouteNotFoundException,
} from '../exceptions/guides.exceptions.js';
import { REQUIRED_GUIDE_DOCUMENTS } from '../guides.enums.js';
import { GuidesRepository } from '../repositories/guides.repository.js';

@Injectable()
export class GuideVerificationService {
  constructor(
    private readonly db: DataSource,
    private readonly accountVerification: AccountVerificationService,
    private readonly guides: GuidesRepository,
    @InjectRepository(GuideDocument)
    private readonly documents: Repository<GuideDocument>,
    @InjectRepository(GuideRoute)
    private readonly guideRoutes: Repository<GuideRoute>,
    private readonly storage: StorageService,
  ) {}

  async list(query: VerificationQueryDto): Promise<GuidePageDto> {
    const [profiles, total] = await this.guides.findPage({
      skip: query.skip,
      take: query.limit,
      status: query.status,
      search: query.search,
    });
    return {
      data: profiles.map((profile) => GuideSummaryDto.fromEntity(profile)),
      meta: PaginationMetaDto.of(query.page, query.limit, total),
    };
  }

  async getById(id: string): Promise<GuideProfileDto> {
    return GuideProfileDto.fromEntity(await this.findOrFail(id));
  }

  async decide(
    id: string,
    dto: VerificationDecisionDto,
    adminId: string,
  ): Promise<GuideProfileDto> {
    await this.db.transaction(async (manager) => {
      const locked = await manager
        .getRepository(GuideProfile)
        .findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
      if (!locked) throw new GuideNotFoundException();
      const profile = await manager
        .getRepository(GuideProfile)
        .findOneOrFail({
          where: { id },
          relations: { user: true, documents: true },
        });
      if (dto.status === VerificationStatus.APPROVED) {
        const missing = missingDocumentTypes(
          REQUIRED_GUIDE_DOCUMENTS,
          profile.documents,
        );
        if (missing.length) throw new DocumentsIncompleteException(missing);
      }
      await this.accountVerification.decideGuide(
        profile,
        dto.status,
        adminId,
        dto.rejectionReason,
      );
      profile.verificationStatus = dto.status;
      profile.rejectionReason =
        dto.status === VerificationStatus.REJECTED
          ? (dto.rejectionReason ?? null)
          : null;
      profile.verifiedById = adminId;
      profile.verifiedAt = new Date();
      await manager.getRepository(GuideProfile).save(profile);
    });
    return this.getById(id);
  }

  async openDocument(id: string, documentId: string): Promise<OpenedFile> {
    const document = await this.documents.findOne({
      where: { id: documentId, guideProfileId: id },
    });
    if (!document) throw new DocumentNotFoundException();
    return this.storage.open(document);
  }

  async listRouteRequests(
    query: GuideRouteRequestQueryDto,
  ): Promise<GuideRouteRequestPageDto> {
    const [requests, total] = await this.guideRoutes.findAndCount({
      where: query.status ? { status: query.status } : {},
      relations: { route: true, guideProfile: { user: true } },
      order: { route: { nameEs: 'ASC' } },
      skip: query.skip,
      take: query.limit,
    });
    return {
      data: requests.map((request) => GuideRouteRequestDto.fromEntity(request)),
      meta: PaginationMetaDto.of(query.page, query.limit, total),
    };
  }

  async decideRoute(
    id: string,
    status: VerificationStatus.APPROVED | VerificationStatus.REJECTED,
    adminId: string,
  ): Promise<GuideRouteRequestDto> {
    const request = await this.guideRoutes.findOne({
      where: { id },
      relations: { route: true, guideProfile: { user: true } },
    });
    if (!request) throw new GuideRouteNotFoundException();
    if (
      status === VerificationStatus.APPROVED &&
      request.guideProfile.verificationStatus !== VerificationStatus.APPROVED
    ) {
      throw new ProviderNotApprovedException();
    }

    request.status = status;
    request.reviewedById = adminId;
    request.reviewedAt = new Date();
    await this.guideRoutes.save(request);
    return GuideRouteRequestDto.fromEntity(request);
  }

  private async findOrFail(id: string): Promise<GuideProfile> {
    const profile = await this.guides.findById(id);
    if (!profile) throw new GuideNotFoundException();
    return profile;
  }
}
