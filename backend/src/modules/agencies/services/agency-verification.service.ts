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
} from '../../../common/exceptions/verification.exceptions.js';
import { missingDocumentTypes } from '../../../common/verification/verification-documents.js';
import {
  OpenedFile,
  StorageService,
} from '../../../storage/storage.service.js';
import { REQUIRED_AGENCY_DOCUMENTS } from '../agencies.enums.js';
import {
  AgencyDto,
  AgencyPageDto,
  AgencySummaryDto,
} from '../dto/agency.dto.js';
import { AgencyDocument } from '../entities/agency-document.entity.js';
import { Agency } from '../entities/agency.entity.js';
import { AgencyNotFoundException } from '../exceptions/agencies.exceptions.js';
import { AgenciesRepository } from '../repositories/agencies.repository.js';

@Injectable()
export class AgencyVerificationService {
  constructor(
    private readonly agencies: AgenciesRepository,
    @InjectRepository(AgencyDocument)
    private readonly documents: Repository<AgencyDocument>,
    private readonly storage: StorageService,
  ) {}

  async list(query: VerificationQueryDto): Promise<AgencyPageDto> {
    const [agencies, total] = await this.agencies.findPage({
      skip: query.skip,
      take: query.limit,
      status: query.status,
      search: query.search,
    });
    return {
      data: agencies.map((agency) => AgencySummaryDto.fromEntity(agency)),
      meta: PaginationMetaDto.of(query.page, query.limit, total),
    };
  }

  async getById(id: string): Promise<AgencyDto> {
    return AgencyDto.fromEntity(await this.findOrFail(id));
  }

  async decide(
    id: string,
    dto: VerificationDecisionDto,
    adminId: string,
  ): Promise<AgencyDto> {
    const agency = await this.findOrFail(id);
    if (dto.status === VerificationStatus.APPROVED) {
      const missing = missingDocumentTypes(
        REQUIRED_AGENCY_DOCUMENTS,
        agency.documents,
      );
      if (missing.length > 0) throw new DocumentsIncompleteException(missing);
    }

    agency.verificationStatus = dto.status;
    agency.rejectionReason =
      dto.status === VerificationStatus.REJECTED
        ? (dto.rejectionReason ?? null)
        : null;
    agency.verifiedById = adminId;
    agency.verifiedAt = new Date();
    await this.agencies.save(agency);
    return this.getById(id);
  }

  async openDocument(id: string, documentId: string): Promise<OpenedFile> {
    const document = await this.documents.findOne({
      where: { id: documentId, agencyId: id },
    });
    if (!document) throw new DocumentNotFoundException();
    return this.storage.open(document);
  }

  private async findOrFail(id: string): Promise<Agency> {
    const agency = await this.agencies.findById(id);
    if (!agency) throw new AgencyNotFoundException();
    return agency;
  }
}
