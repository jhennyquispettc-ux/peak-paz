import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class RequestGuideRouteDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  routeId: string;
}
