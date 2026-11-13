import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfig } from '../../config/app.config.js';
import { BookingsModule } from '../bookings/bookings.module.js';
import { GuidesModule } from '../guides/guides.module.js';
import { SettingsModule } from '../settings/settings.module.js';
import { BookingCancellationController } from './controllers/booking-cancellation.controller.js';
import { BookingPaymentsController } from './controllers/booking-payments.controller.js';
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
import { PayoutsService } from './services/payouts.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, Refund, Payout]),
    BookingsModule,
    GuidesModule,
    SettingsModule,
  ],
  controllers: [
    BookingPaymentsController,
    BookingCancellationController,
    PayoutsController,
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
  ],
})
export class PaymentsModule {}
