import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SettingDto } from '../dto/setting.dto.js';
import { Setting } from '../entities/setting.entity.js';
import { SettingKey } from '../setting-keys.js';

const CACHE_MS = 60_000;

@Injectable()
export class SettingsService {
  private cache: { expiresAt: number; values: Map<string, string> } | null =
    null;

  constructor(
    @InjectRepository(Setting) private readonly settings: Repository<Setting>,
  ) {}

  async getNumber(key: SettingKey): Promise<number> {
    const values = await this.load();
    const value = Number(values.get(key));
    if (!Number.isFinite(value)) {
      throw new Error(`Setting ${key} is missing or not a number.`);
    }
    return value;
  }

  async list(): Promise<SettingDto[]> {
    const settings = await this.settings.find({ order: { key: 'ASC' } });
    return settings.map((setting) => SettingDto.fromEntity(setting));
  }

  async update(key: string, value: number): Promise<SettingDto> {
    const setting = await this.settings.findOne({ where: { key } });
    if (!setting) {
      throw new NotFoundException({
        error: 'SETTING_NOT_FOUND',
        message: 'Setting not found.',
      });
    }
    setting.value = String(value);
    const saved = await this.settings.save(setting);
    this.cache = null;
    return SettingDto.fromEntity(saved);
  }

  private async load(): Promise<Map<string, string>> {
    if (this.cache && this.cache.expiresAt > Date.now()) {
      return this.cache.values;
    }
    const settings = await this.settings.find();
    const values = new Map(
      settings.map((setting) => [setting.key, setting.value]),
    );
    this.cache = { expiresAt: Date.now() + CACHE_MS, values };
    return values;
  }
}
