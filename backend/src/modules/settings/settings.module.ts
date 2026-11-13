import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminSettingsController } from './controllers/admin-settings.controller.js';
import { Setting } from './entities/setting.entity.js';
import { SettingsService } from './services/settings.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Setting])],
  controllers: [AdminSettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
