import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../../common/dto/pagination-meta.dto.js';
import { VerificationStatus } from '../../../common/enums/verification-status.enum.js';
import { missingDocumentTypes } from '../../../common/verification/verification-documents.js';
import { GuideProfile } from '../entities/guide-profile.entity.js';
import { REQUIRED_GUIDE_DOCUMENTS } from '../guides.enums.js';

export class GuideSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Juan Mamani' })
  fullName: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ enum: VerificationStatus })
  verificationStatus: VerificationStatus;

  @ApiProperty({ description: 'Tiene todos los documentos vigentes' })
  documentsComplete: boolean;

  @ApiProperty()
  createdAt: Date;

  static fromEntity(profile: GuideProfile): GuideSummaryDto {
    return {
      id: profile.id,
      fullName: `${profile.user.firstName} ${profile.user.lastName}`,
      email: profile.user.email,
      verificationStatus: profile.verificationStatus,
      documentsComplete:
        missingDocumentTypes(REQUIRED_GUIDE_DOCUMENTS, profile.documents ?? [])
          .length === 0,
      createdAt: profile.createdAt,
    };
  }
}

export class GuidePageDto {
  @ApiProperty({ type: [GuideSummaryDto] })
  data: GuideSummaryDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
