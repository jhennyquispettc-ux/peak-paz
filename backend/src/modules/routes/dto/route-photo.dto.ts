import { ApiProperty } from '@nestjs/swagger';
import { RoutePhoto } from '../entities/route-photo.entity.js';

export class RoutePhotoDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  url: string;

  @ApiProperty({ nullable: true })
  credit: string | null;

  @ApiProperty()
  sortOrder: number;

  static fromEntity(photo: RoutePhoto): RoutePhotoDto {
    return {
      id: photo.id,
      url: photo.url,
      credit: photo.credit,
      sortOrder: photo.sortOrder,
    };
  }
}
