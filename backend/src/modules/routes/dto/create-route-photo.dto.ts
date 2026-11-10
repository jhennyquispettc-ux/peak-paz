import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Max,
  Min,
} from 'class-validator';

export class CreateRoutePhotoDto {
  @ApiProperty({
    example: 'https://res.cloudinary.com/demo/image/upload/choro.jpg',
  })
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @Length(10, 500)
  url: string;

  @ApiProperty({ example: 'routes/choro-3-dias/cover' })
  @IsString()
  @Length(1, 200)
  publicId: string;

  @ApiPropertyOptional({ example: 'Foto: Peak Paz' })
  @IsOptional()
  @IsString()
  @Length(1, 120)
  credit?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  sortOrder?: number;
}
