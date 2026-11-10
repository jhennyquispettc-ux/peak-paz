import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';
import { Difficulty } from '../routes.enums.js';

export class RouteQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: Difficulty })
  @IsOptional()
  @IsEnum(Difficulty)
  difficulty?: Difficulty;

  @ApiPropertyOptional({ minimum: 1, description: 'Rutas de hasta N días' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxDays?: number;

  @ApiPropertyOptional({ description: 'Busca por nombre en español o inglés' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}
