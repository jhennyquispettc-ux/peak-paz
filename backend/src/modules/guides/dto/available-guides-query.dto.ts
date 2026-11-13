import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional, Matches, ValidateIf } from 'class-validator';

export class AvailableGuidesQueryDto {
  @ApiPropertyOptional({
    example: '2026-12-05',
    description: 'Si se envía, solo muestra guías libres ese día',
  })
  @IsOptional()
  @IsISO8601({ strict: true })
  date?: string;

  @ApiPropertyOptional({
    example: '07:00',
    description: 'Obligatoria junto con date',
  })
  @ValidateIf((query: AvailableGuidesQueryDto) => query.date !== undefined)
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'startTime must use HH:mm',
  })
  startTime?: string;
}
