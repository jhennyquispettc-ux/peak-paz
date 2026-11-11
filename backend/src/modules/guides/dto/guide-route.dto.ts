import { ApiProperty } from '@nestjs/swagger';
import { VerificationStatus } from '../../../common/enums/verification-status.enum.js';
import { GuideRoute } from '../entities/guide-route.entity.js';

export class GuideRouteDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  routeId: string;

  @ApiProperty({ example: 'choro-3-dias' })
  routeSlug: string;

  @ApiProperty()
  routeNameEs: string;

  @ApiProperty({ enum: VerificationStatus })
  status: VerificationStatus;

  @ApiProperty({ nullable: true })
  reviewedAt: Date | null;

  static fromEntity(guideRoute: GuideRoute): GuideRouteDto {
    return {
      id: guideRoute.id,
      routeId: guideRoute.routeId,
      routeSlug: guideRoute.route?.slug,
      routeNameEs: guideRoute.route?.nameEs,
      status: guideRoute.status,
      reviewedAt: guideRoute.reviewedAt,
    };
  }
}
