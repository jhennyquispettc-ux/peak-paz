import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { VerificationDocumentDto } from '../../../common/dto/verification-document.dto.js';
import { VerificationStatus } from '../../../common/enums/verification-status.enum.js';
import {
  DocumentNotFoundException,
  DocumentsIncompleteException,
  ProfileLockedException,
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
import { User } from '../../users/entities/user.entity.js';
import { REQUIRED_AGENCY_DOCUMENTS } from '../agencies.enums.js';
import { AgencyDto } from '../dto/agency.dto.js';
import { RegisterAgencyDto } from '../dto/register-agency.dto.js';
import {
  AGENCY_LEGAL_FIELDS,
  UpdateAgencyDto,
} from '../dto/update-agency.dto.js';
import { UploadAgencyDocumentDto } from '../dto/upload-agency-document.dto.js';
import { AgencyDocument } from '../entities/agency-document.entity.js';
import { Agency } from '../entities/agency.entity.js';
import { AgencyNotFoundException } from '../exceptions/agencies.exceptions.js';
import { AgenciesRepository } from '../repositories/agencies.repository.js';

@Injectable()
export class AgencyProfilesService {
  constructor(
    private readonly agencies: AgenciesRepository,
    @InjectRepository(AgencyDocument) //es una anotacion que es necesaria para inyectar el repositorio
    private readonly documents: Repository<AgencyDocument>,
    private readonly storage: StorageService,
  ) {}

  existsByTaxId(taxId: string): Promise<boolean> {
    return this.agencies.existsByTaxId(taxId);
  }

  createForUser(
    manager: EntityManager,
    user: User,
    dto: RegisterAgencyDto,
  ): Promise<Agency> {
    const agency = this.agencies.create(
      {
        userId: user.id, //llega del JWT
        legalName: dto.legalName,
        taxId: dto.taxId,
        operatorLicense: dto.operatorLicense,
        association: dto.association,
        address: dto.address,
        descriptionEs: dto.descriptionEs ?? null,
        descriptionEn: dto.descriptionEn ?? null,
        verificationStatus: VerificationStatus.PENDING,
      },
      manager,
    );
    return this.agencies.save(agency, manager); //se guarda en la base de datos
  }

  async getMine(userId: string): Promise<AgencyDto> {
    return AgencyDto.fromEntity(await this.findMine(userId));
  }

  async updateMine(userId: string, dto: UpdateAgencyDto): Promise<AgencyDto> {
    const agency = await this.findMine(userId);
    const changesLegalData = AGENCY_LEGAL_FIELDS.some(
      (field) => dto[field] !== undefined && dto[field] !== agency[field],
    );
    if (
      changesLegalData &&
      agency.verificationStatus === VerificationStatus.APPROVED
    ) {
      throw new ProfileLockedException();
    }
    Object.assign(agency, dto);
    await this.agencies.save(agency);
    return this.getMine(userId);
  }

  async uploadDocument(
    userId: string,
    dto: UploadAgencyDocumentDto,
    file: UploadedFileData | undefined,
  ): Promise<VerificationDocumentDto> {
    const prepared = prepareDocumentFile(file, dto.expiresAt);
    const agency = await this.findMine(userId);
    const previous = agency.documents.filter(
      (document) => document.type === dto.type,
    );

    const stored = await this.storage.save(`agencies/${agency.id}`, prepared);
    let saved: AgencyDocument;
    try {
      saved = await this.documents.save(
        this.documents.create({
          agencyId: agency.id,
          type: dto.type,
          expiresAt: dto.expiresAt ?? null,
          url: stored.url,
          publicId: stored.publicId,
        }),
      );
    } catch (error) {
      await this.storage.remove(stored);
      throw error;
    }

    for (const document of previous) {
      await this.documents.delete({ id: document.id });
      await this.storage.remove(document);
    }
    return VerificationDocumentDto.fromEntity(saved);
  }

  async removeDocument(userId: string, documentId: string): Promise<void> {
    const document = await this.findMyDocument(userId, documentId);
    await this.documents.delete({ id: document.id });
    await this.storage.remove(document);
  }

  async openDocument(userId: string, documentId: string): Promise<OpenedFile> {
    return this.storage.open(await this.findMyDocument(userId, documentId));
  }

  async requestReview(userId: string): Promise<AgencyDto> {
    const agency = await this.findMine(userId);
    if (agency.verificationStatus !== VerificationStatus.REJECTED) {
      throw new ReviewNotAvailableException();
    }
    const missing = missingDocumentTypes(
      REQUIRED_AGENCY_DOCUMENTS,
      agency.documents,
    );
    if (missing.length > 0) throw new DocumentsIncompleteException(missing);

    agency.verificationStatus = VerificationStatus.PENDING;
    agency.rejectionReason = null;
    await this.agencies.save(agency);
    return this.getMine(userId);
  }

  private async findMine(userId: string): Promise<Agency> {
    const agency = await this.agencies.findByUserId(userId);
    if (!agency) throw new AgencyNotFoundException();
    return agency;
  }

  private async findMyDocument(
    userId: string,
    documentId: string,
  ): Promise<AgencyDocument> {
    const agency = await this.agencies.findIdByUserId(userId);
    if (!agency) throw new AgencyNotFoundException();
    const document = await this.documents.findOne({
      where: { id: documentId, agencyId: agency.id },
    });
    if (!document) throw new DocumentNotFoundException();
    return document;
  }
}
