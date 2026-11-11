import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { RegisterDto } from '../../auth/dto/register.dto.js';

export const NATIONAL_ID_PATTERN = /^[0-9]{5,12}(-?[0-9A-Z]{1,3})?$/;
export const LANGUAGE_CODE_PATTERN = /^[a-z]{2}$/;

export class RegisterGuideDto extends RegisterDto {
  @ApiProperty({ example: '6123456-1B', description: 'Cédula de identidad' })
  @Matches(NATIONAL_ID_PATTERN, {
    message: 'nationalId must be a Bolivian identity card number',
  })
  nationalId: string;

  @ApiProperty({
    example: ['es', 'en', 'ay'],
    description: 'Códigos ISO 639-1 de los idiomas que habla',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ArrayUnique()
  @Matches(LANGUAGE_CODE_PATTERN, {
    each: true,
    message: 'each language must be a 2 letter ISO 639-1 code',
  })
  languages: string[];

  @ApiProperty({ example: 6 })
  @IsInt()
  @Min(0)
  @Max(60)
  yearsExperience: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(10, 2000)
  bioEs?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(10, 2000)
  bioEn?: string;
}
