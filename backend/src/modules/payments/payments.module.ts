import { RescheduleRejectionController } from './controllers/reschedule-rejection.controller.js';
import { RescheduleRejectionService } from './services/reschedule-rejection.service.js';
import { AdminDisputesController } from './controllers/admin-disputes.controller.js';
import { DisputeResolutionService } from './services/dispute-resolution.service.js';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfig } from '../../config/app.config.js';
import { AgenciesModule } from '../agencies/agencies.module.js';
import { BookingsModule } from '../bookings/bookings.module.js';
import { GroupDeparturesModule } from '../group-departures/group-departures.module.js';
import { GuidesModule } from '../guides/guides.module.js';
import { SettingsModule } from '../settings/settings.module.js';
import { StrikesModule } from '../strikes/strikes.module.js';
import { BookingCancellationController } from './controllers/booking-cancellation.controller.js';
import { BookingPaymentsController } from './controllers/booking-payments.controller.js';
import { DepartureCancellationController } from './controllers/departure-cancellation.controller.js';
import { PayoutsController } from './controllers/payouts.controller.js';
import { Payment } from './entities/payment.entity.js';
import { Payout } from './entities/payout.entity.js';
import { Refund } from './entities/refund.entity.js';
import { FakePaymentProvider } from './providers/fake-payment.provider.js';
import { PaymentProvider } from './providers/payment-provider.js';
import { PayPalPaymentProvider } from './providers/paypal-payment.provider.js';
import { PaymentsRepository } from './repositories/payments.repository.js';
import { PayoutsRepository } from './repositories/payouts.repository.js';
import { BookingCancellationService } from './services/booking-cancellation.service.js';
import { BookingCompletionService } from './services/booking-completion.service.js';
import { BookingPaymentsService } from './services/booking-payments.service.js';
import { DepartureLifecycleService } from './services/departure-lifecycle.service.js';
import { PayoutsService } from './services/payouts.service.js';
import { SuspendedGuideBookingsService } from './services/suspended-guide-bookings.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, Refund, Payout]),
    BookingsModule,
    GuidesModule,
    AgenciesModule,
    GroupDeparturesModule,
    SettingsModule,
    StrikesModule,
  ],
  controllers: [
    BookingPaymentsController,
    BookingCancellationController,
    DepartureCancellationController,
    PayoutsController,
    AdminDisputesController,
    RescheduleRejectionController,
  ],
  providers: [
    {
      provide: PaymentProvider,
      inject: [AppConfig],
      useFactory: (config: AppConfig): PaymentProvider =>
        config.payments.driver === 'paypal'
          ? new PayPalPaymentProvider({
              ...config.payments.paypal,
              returnUrl: config.payments.returnUrl,
              cancelUrl: config.payments.cancelUrl,
            })
          : new FakePaymentProvider(config.payments.returnUrl),
    },
    PaymentsRepository,
    PayoutsRepository,
    PayoutsService,
    BookingPaymentsService,
    BookingCancellationService,
    BookingCompletionService,
    DepartureLifecycleService,
    SuspendedGuideBookingsService,
    DisputeResolutionService,
    RescheduleRejectionService,
  ],
})
export class PaymentsModule {}
