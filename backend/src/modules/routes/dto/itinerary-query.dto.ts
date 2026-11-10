import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, Matches } from 'class-validator';

export class ItineraryQueryDto {
  @ApiPropertyOptional({
    example: '07:00',
    description:
      'Hora de inicio. Si no se envía, se usa el inicio de la ventana sugerida',
  })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'startTime must use HH:mm',
  })
  startTime?: string;
}
