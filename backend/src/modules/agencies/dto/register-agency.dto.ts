import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length, Matches } from 'class-validator';
import { RegisterDto } from '../../auth/dto/register.dto.js';

export class RegisterAgencyDto extends RegisterDto {
  @ApiProperty({ example: 'Andes Trekking S.R.L.' })
  @IsString()
  @Length(3, 160)
  legalName: string;

  @ApiProperty({ example: '1020304025', description: 'NIT de la agencia' })
  @Matches(/^[0-9]{7,15}$/, {
    message: 'taxId must be a NIT with 7 to 15 digits',
  })
  taxId: string;

  @ApiProperty({ example: 'Calle Sagárnaga 213, La Paz' })
  @IsString()
  @Length(5, 200)
  address: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(10, 2000)
  descriptionEs?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(10, 2000)
  descriptionEn?: string;
}
