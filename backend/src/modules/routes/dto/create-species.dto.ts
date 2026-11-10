import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUrl, Length } from 'class-validator';
import { SpeciesKind } from '../routes.enums.js';

export class CreateSpeciesDto {
  @ApiProperty({ example: 'Cóndor andino' })
  @IsString()
  @Length(2, 120)
  commonNameEs: string;

  @ApiProperty({ example: 'Andean condor' })
  @IsString()
  @Length(2, 120)
  commonNameEn: string;

  @ApiPropertyOptional({ example: 'Vultur gryphus' })
  @IsOptional()
  @IsString()
  @Length(2, 160)
  scientificName?: string;

  @ApiProperty({ enum: SpeciesKind })
  @IsEnum(SpeciesKind)
  kind: SpeciesKind;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @Length(10, 500)
  photoUrl?: string;
}
