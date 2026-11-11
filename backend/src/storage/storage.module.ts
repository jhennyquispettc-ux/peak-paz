import { Global, Module } from '@nestjs/common';
import { AppConfig } from '../config/app.config.js';
import { CloudinaryStorageService } from './cloudinary-storage.service.js';
import { LocalStorageService } from './local-storage.service.js';
import { StorageService } from './storage.service.js';

@Global()
@Module({
  providers: [
    {
      provide: StorageService,
      inject: [AppConfig],
      useFactory: (config: AppConfig): StorageService =>
        config.storage.driver === 'cloudinary'
          ? new CloudinaryStorageService(config.storage.cloudinary)
          : new LocalStorageService(config.storage.localDir),
    },
  ],
  exports: [StorageService],
})
export class StorageModule {}
