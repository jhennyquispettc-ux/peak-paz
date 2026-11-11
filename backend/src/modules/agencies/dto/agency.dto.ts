import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../../common/dto/pagination-meta.dto.js';
import { VerificationDocumentDto } from '../../../common/dto/verification-document.dto.js';
import { VerificationStatus } from '../../../common/enums/verification-status.enum.js';
import { missingDocumentTypes } from '../../../common/verification/verification-documents.js';
import { UserDto } from '../../users/dto/user.dto.js';
import {
  AgencyDocumentType,
  REQUIRED_AGENCY_DOCUMENTS,
} from '../agencies.enums.js';
import { Agency } from '../entities/agency.entity.js';

export class AgencyDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ type: UserDto, description: 'Representante de la agencia' })
  user: UserDto;

  @ApiProperty()
  legalName: string;

  @ApiProperty()
  taxId: string;

  @ApiProperty()
  operatorLicense: string;

  @ApiProperty()
  association: string;

  @ApiProperty()
  address: string;

  @ApiProperty({ nullable: true })
  descriptionEs: string | null;

  @ApiProperty({ nullable: true })
  descriptionEn: string | null;

  @ApiProperty({ enum: VerificationStatus })
  verificationStatus: VerificationStatus;

  @ApiProperty({ nullable: true })
  rejectionReason: string | null;

  @ApiProperty({ nullable: true })
  verifiedAt: Date | null;

  @ApiProperty()
  ratingAverage: number;

  @ApiProperty()
  reviewsCount: number;

  @ApiProperty({ type: [VerificationDocumentDto] })
  documents: VerificationDocumentDto[];

  @ApiProperty({
    enum: AgencyDocumentType,
    isArray: true,
    description: 'Documentos que faltan o están vencidos',
  })
  missingDocuments: AgencyDocumentType[];

  static fromEntity(agency: Agency): AgencyDto {
    const documents = agency.documents ?? [];
    return {
      id: agency.id,
      user: UserDto.fromEntity(agency.user),
      legalName: agency.legalName,
      taxId: agency.taxId,
      operatorLicense: agency.operatorLicense,
      association: agency.association,
      address: agency.address,
      descriptionEs: agency.descriptionEs,
      descriptionEn: agency.descriptionEn,
      verificationStatus: agency.verificationStatus,
      rejectionReason: agency.rejectionReason,
      verifiedAt: agency.verifiedAt,
      ratingAverage: agency.ratingAverage,
      reviewsCount: agency.reviewsCount,
      documents: documents.map((document) =>
        VerificationDocumentDto.fromEntity(document),
      ),
      missingDocuments: missingDocumentTypes(
        REQUIRED_AGENCY_DOCUMENTS,
        documents,
      ),
    };
  }
}

export class AgencySummaryDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  legalName: string;

  @ApiProperty()
  taxId: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ enum: VerificationStatus })
  verificationStatus: VerificationStatus;

  @ApiProperty({ description: 'Tiene todos los documentos vigentes' })
  documentsComplete: boolean;

  @ApiProperty()
  createdAt: Date;

  static fromEntity(agency: Agency): AgencySummaryDto {
    return {
      id: agency.id,
      legalName: agency.legalName,
      taxId: agency.taxId,
      email: agency.user.email,
      verificationStatus: agency.verificationStatus,
      documentsComplete:
        missingDocumentTypes(REQUIRED_AGENCY_DOCUMENTS, agency.documents ?? [])
          .length === 0,
      createdAt: agency.createdAt,
    };
  }
}

export class AgencyPageDto {
  @ApiProperty({ type: [AgencySummaryDto] })
  data: AgencySummaryDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
