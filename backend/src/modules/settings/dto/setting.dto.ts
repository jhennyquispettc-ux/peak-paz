import { ApiProperty } from '@nestjs/swagger';
import { Setting } from '../entities/setting.entity.js';

export class SettingDto {
  @ApiProperty({ example: 'RESPONSE_WINDOW_MIN' })
  key: string;

  @ApiProperty({ example: '120' })
  value: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(setting: Setting): SettingDto {
    return {
      key: setting.key,
      value: setting.value,
      description: setting.description,
      updatedAt: setting.updatedAt,
    };
  }
}
