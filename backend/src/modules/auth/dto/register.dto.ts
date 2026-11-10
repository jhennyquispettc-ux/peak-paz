import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsISO31661Alpha2,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';
import { Language } from '../../users/users.enums.js';

export class RegisterDto {
  @ApiProperty({ example: 'ana.muller@example.com' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(160)
  email: string;

  @ApiProperty({
    example: 'Trekking2026',
    description: 'Entre 8 y 64 caracteres, con al menos una letra y un número',
  })
  @IsString()
  @Length(8, 64)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: 'password must contain at least one letter and one number',
  })
  password: string;

  @ApiProperty({ example: 'Ana' })
  @IsString()
  @Length(1, 80)
  firstName: string;

  @ApiProperty({ example: 'Müller' })
  @IsString()
  @Length(1, 80)
  lastName: string;

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

  @ApiPropertyOptional({ enum: Language, default: Language.ES })
  @IsOptional()
  @IsEnum(Language)
  language?: Language;
}
