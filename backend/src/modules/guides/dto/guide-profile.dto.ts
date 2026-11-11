import { ApiProperty } from '@nestjs/swagger';
import { VerificationDocumentDto } from '../../../common/dto/verification-document.dto.js';
import { VerificationStatus } from '../../../common/enums/verification-status.enum.js';
import { missingDocumentTypes } from '../../../common/verification/verification-documents.js';
import { UserDto } from '../../users/dto/user.dto.js';
import { GuideProfile } from '../entities/guide-profile.entity.js';
import {
  GuideDocumentType,
  REQUIRED_GUIDE_DOCUMENTS,
} from '../guides.enums.js';
import { GuideRouteDto } from './guide-route.dto.js';

export class GuideProfileDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ type: UserDto })
  user: UserDto;

  @ApiProperty({ example: '6123456-1B' })
  nationalId: string;

  @ApiProperty({ nullable: true })
  bioEs: string | null;

  @ApiProperty({ nullable: true })
  bioEn: string | null;

  @ApiProperty({ example: ['es', 'en'] })
  languages: string[];

  @ApiProperty()
  yearsExperience: number;

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
    enum: GuideDocumentType,
    isArray: true,
    description: 'Documentos que faltan o están vencidos',
  })
  missingDocuments: GuideDocumentType[];

  @ApiProperty({ type: [GuideRouteDto] })
  routes: GuideRouteDto[];

  static fromEntity(profile: GuideProfile): GuideProfileDto {
    const documents = profile.documents ?? [];
    return {
      id: profile.id,
      user: UserDto.fromEntity(profile.user),
      nationalId: profile.nationalId,
      bioEs: profile.bioEs,
      bioEn: profile.bioEn,
      languages: profile.languages,
      yearsExperience: profile.yearsExperience,
      verificationStatus: profile.verificationStatus,
      rejectionReason: profile.rejectionReason,
      verifiedAt: profile.verifiedAt,
      ratingAverage: profile.ratingAverage,
      reviewsCount: profile.reviewsCount,
      documents: documents.map((document) =>
        VerificationDocumentDto.fromEntity(document),
      ),
      missingDocuments: missingDocumentTypes(
        REQUIRED_GUIDE_DOCUMENTS,
        documents,
      ),
      routes: (profile.routes ?? []).map((guideRoute) =>
        GuideRouteDto.fromEntity(guideRoute),
      ),
    };
  }
}
