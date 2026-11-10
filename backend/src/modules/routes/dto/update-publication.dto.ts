import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdatePublicationDto {
  @ApiProperty()
  @IsBoolean()
  isPublished: boolean;
}
