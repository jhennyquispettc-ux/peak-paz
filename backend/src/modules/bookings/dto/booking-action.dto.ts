import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

export class BookingReasonDto {
  @ApiPropertyOptional({ example: 'Ese día tengo otro compromiso.' })
  @IsOptional()
  @IsString()
  @Length(3, 500)
  reason?: string;
}
