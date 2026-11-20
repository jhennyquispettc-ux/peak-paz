import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgenciesModule } from '../agencies/agencies.module.js';
import { BookingsModule } from '../bookings/bookings.module.js';
import { GuidesModule } from '../guides/guides.module.js';
import { SettingsModule } from '../settings/settings.module.js';
import { ReviewsController } from './controllers/reviews.controller.js';
import { Review } from './entities/review.entity.js';
import { ReviewsRepository } from './repositories/reviews.repository.js';
import { ReviewsService } from './services/reviews.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Review]),
    BookingsModule,
    GuidesModule,
    AgenciesModule,
    SettingsModule,
  ],
  controllers: [ReviewsController],
  providers: [ReviewsRepository, ReviewsService],
})
export class ReviewsModule {}
