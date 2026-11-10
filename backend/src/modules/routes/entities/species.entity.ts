import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { SpeciesKind } from '../routes.enums.js';

@Entity('species')
export class Species {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'common_name_es', type: 'varchar', length: 120 })
  commonNameEs: string;

  @Column({ name: 'common_name_en', type: 'varchar', length: 120 })
  commonNameEn: string;

  @Column({
    name: 'scientific_name',
    type: 'varchar',
    length: 160,
    nullable: true,
  })
  scientificName: string | null;

  @Column({ type: 'enum', enum: SpeciesKind, enumName: 'species_kind' })
  kind: SpeciesKind;

  @Column({ name: 'photo_url', type: 'varchar', length: 500, nullable: true })
  photoUrl: string | null;
}
