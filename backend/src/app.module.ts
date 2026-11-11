import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/config.module.js';
import { DatabaseModule } from './database/database.module.js';
import { HealthModule } from './health/health.module.js';
import { StorageModule } from './storage/storage.module.js';
import { AgenciesModule } from './modules/agencies/agencies.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { GuidesModule } from './modules/guides/guides.module.js';
import { RoutesModule } from './modules/routes/routes.module.js';
import { UsersModule } from './modules/users/users.module.js';

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    StorageModule,
    HealthModule,
    UsersModule,
    AuthModule,
    RoutesModule,
    GuidesModule,
    AgenciesModule,
  ],
})
export class AppModule {}
