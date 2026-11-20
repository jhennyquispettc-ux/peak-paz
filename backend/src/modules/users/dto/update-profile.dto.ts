import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsISO31661Alpha2,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';
import { Language } from '../users.enums.js';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Ana' })
  @IsOptional()
  @IsString()
  @Length(1, 80)
  @Matches(/\S/, { message: 'firstName must not be blank' })
  firstName?: string;

  @ApiPropertyOptional({ example: 'Müller' })
  @IsOptional()
  @IsString()
  @Length(1, 80)
  @Matches(/\S/, { message: 'lastName must not be blank' })
  lastName?: string;

  @ApiPropertyOptional({ example: '+41 79 123 45 67' })
  @IsOptional()
  @Matches(/^\+?[0-9 ]{7,20}$/, {
    message: 'phone must contain only digits, spaces and an optional +',
  })
  phone?: string;

  @ApiPropertyOptional({ example: 'CH', description: 'Código ISO de 2 letras' })
  @IsOptional()
  @IsISO31661Alpha2()
  country?: string;

  @ApiPropertyOptional({ enum: Language })
  @IsOptional()
  @IsEnum(Language)
  language?: Language;
}
