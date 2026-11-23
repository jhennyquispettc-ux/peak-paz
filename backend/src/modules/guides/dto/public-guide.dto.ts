import { ApiProperty } from '@nestjs/swagger';
import { VerificationStatus } from '../../../common/enums/verification-status.enum.js';
import { GuideProfile } from '../entities/guide-profile.entity.js';
import { GUIDE_CREDENTIAL_TYPES } from '../guides.enums.js';
import type { GuideCredentialType } from '../guides.enums.js';

export class PublicGuideRouteDto {
  @ApiProperty({ format: 'uuid' })
  routeId: string;

  @ApiProperty({ example: 'choro-3-dias' })
  slug: string;

  @ApiProperty()
  nameEs: string;

  @ApiProperty()
  nameEn: string;
}

export class PublicGuideDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Juan' })
  firstName: string;

  @ApiProperty({ example: 'Mamani' })
  lastName: string;

  @ApiProperty({ enum: GUIDE_CREDENTIAL_TYPES, nullable: true })
  credentialType: GuideCredentialType | null;

  @ApiProperty({ example: ['es', 'en'] })
  languages: string[];

  @ApiProperty()
  yearsExperience: number;

  @ApiProperty({ nullable: true })
  bioEs: string | null;

  @ApiProperty({ nullable: true })
  bioEn: string | null;

  @ApiProperty({ example: 4.8 })
  ratingAverage: number;

  @ApiProperty()
  reviewsCount: number;

  @ApiProperty({ type: [PublicGuideRouteDto] })
  routes: PublicGuideRouteDto[];

  static fromEntity(profile: GuideProfile): PublicGuideDto {
    return {
      id: profile.id,
      firstName: profile.user.firstName,
      lastName: profile.user.lastName,
      credentialType: profile.credentialType,
      languages: profile.languages,
      yearsExperience: profile.yearsExperience,
      bioEs: profile.bioEs,
      bioEn: profile.bioEn,
      ratingAverage: profile.ratingAverage,
      reviewsCount: profile.reviewsCount,
      routes: (profile.routes ?? [])
        .filter(
          (guideRoute) =>
            guideRoute.status === VerificationStatus.APPROVED &&
            guideRoute.route?.isPublished,
        )
        .map((guideRoute) => ({
          routeId: guideRoute.routeId,
          slug: guideRoute.route.slug,
          nameEs: guideRoute.route.nameEs,
          nameEn: guideRoute.route.nameEn,
        })),
    };
  }
}
