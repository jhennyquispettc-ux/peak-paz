import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../../common/dto/pagination-meta.dto.js';
import { RouteSummaryDto } from './route-summary.dto.js';

export class RoutePageDto {
  @ApiProperty({ type: [RouteSummaryDto] })
  data: RouteSummaryDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
