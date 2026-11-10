import { ApiProperty } from '@nestjs/swagger';
import { Species } from '../entities/species.entity.js';
import { SpeciesKind } from '../routes.enums.js';

export class SpeciesDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  commonNameEs: string;

  @ApiProperty()
  commonNameEn: string;

  @ApiProperty({ nullable: true })
  scientificName: string | null;

  @ApiProperty({ enum: SpeciesKind })
  kind: SpeciesKind;

  @ApiProperty({ nullable: true })
  photoUrl: string | null;

  static fromEntity(species: Species): SpeciesDto {
    return {
      id: species.id,
      commonNameEs: species.commonNameEs,
      commonNameEn: species.commonNameEn,
      scientificName: species.scientificName,
      kind: species.kind,
      photoUrl: species.photoUrl,
    };
  }
}
