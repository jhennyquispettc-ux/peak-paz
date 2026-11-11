import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsIn, IsOptional } from 'class-validator';
import { PaginationMetaDto } from '../../../common/dto/pagination-meta.dto.js';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';
import { VerificationStatus } from '../../../common/enums/verification-status.enum.js';
import { GuideRoute } from '../entities/guide-route.entity.js';
import { GuideRouteDto } from './guide-route.dto.js';

export class GuideRouteRequestDto extends GuideRouteDto {
  @ApiProperty({ format: 'uuid' })
  guideProfileId: string;

  @ApiProperty({ example: 'Juan Mamani' })
  guideName: string;

  @ApiProperty({ enum: VerificationStatus })
  guideVerificationStatus: VerificationStatus;

  static fromEntity(guideRoute: GuideRoute): GuideRouteRequestDto {
    const user = guideRoute.guideProfile.user;
    return Object.assign(GuideRouteDto.fromEntity(guideRoute), {
      guideProfileId: guideRoute.guideProfileId,
      guideName: `${user.firstName} ${user.lastName}`,
      guideVerificationStatus: guideRoute.guideProfile.verificationStatus,
    });
  }
}

export class GuideRouteRequestPageDto {
  @ApiProperty({ type: [GuideRouteRequestDto] })
  data: GuideRouteRequestDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}

export class GuideRouteRequestQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: VerificationStatus })
  @IsOptional()
  @IsEnum(VerificationStatus)
  status?: VerificationStatus;
}

const DECISIONS = [VerificationStatus.APPROVED, VerificationStatus.REJECTED];

export class GuideRouteDecisionDto {
  @ApiProperty({ enum: DECISIONS })
  @IsIn(DECISIONS)
  status: VerificationStatus.APPROVED | VerificationStatus.REJECTED;
}
