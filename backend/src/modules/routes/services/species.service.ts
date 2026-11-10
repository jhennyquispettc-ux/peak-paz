import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateSpeciesDto } from '../dto/create-species.dto.js';
import { SpeciesDto } from '../dto/species.dto.js';
import { UpdateSpeciesDto } from '../dto/update-species.dto.js';
import { Species } from '../entities/species.entity.js';
import { SpeciesNotFoundException } from '../exceptions/routes.exceptions.js';

@Injectable()
export class SpeciesService {
  constructor(
    @InjectRepository(Species) private readonly species: Repository<Species>,
  ) {}

  async list(): Promise<SpeciesDto[]> {
    const items = await this.species.find({
      order: { kind: 'ASC', commonNameEs: 'ASC' },
    });
    return items.map((item) => SpeciesDto.fromEntity(item));
  }

  async create(dto: CreateSpeciesDto): Promise<SpeciesDto> {
    const species = this.species.create(dto);
    return SpeciesDto.fromEntity(await this.species.save(species));
  }

  async update(id: string, dto: UpdateSpeciesDto): Promise<SpeciesDto> {
    const species = await this.species.findOne({ where: { id } });
    if (!species) throw new SpeciesNotFoundException();
    Object.assign(species, dto);
    return SpeciesDto.fromEntity(await this.species.save(species));
  }

  async remove(id: string): Promise<void> {
    const result = await this.species.delete({ id });
    if (!result.affected) throw new SpeciesNotFoundException();
  }
}
