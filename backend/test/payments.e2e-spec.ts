import { confirmTestEmail } from './helpers/confirm-email.js';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { DataSource } from 'typeorm';
import { AppModule } from './../src/app.module.js';
import { configureApp } from './../src/app.setup.js';
import { addDays } from './../src/common/time/la-paz-time.js';
import { todayInLaPaz } from './../src/common/verification/verification-documents.js';
import { Booking } from './../src/modules/bookings/entities/booking.entity.js';
import { GuideProfile } from './../src/modules/guides/entities/guide-profile.entity.js';
import { Payment } from './../src/modules/payments/entities/payment.entity.js';
import { Payout } from './../src/modules/payments/entities/payout.entity.js';
import { Refund } from './../src/modules/payments/entities/refund.entity.js';
import { BookingCompletionService } from './../src/modules/payments/services/booking-completion.service.js';
import { Route } from './../src/modules/routes/entities/route.entity.js';
import { User } from './../src/modules/users/entities/user.entity.js';

const PDF = Buffer.from('%PDF-1.4\n%%EOF');

describe('Payments, refunds and payouts (e2e)', () => {
  let app: INestApplication<App>;
  let server: App;
  let dataSource: DataSource;
  let adminToken: string;
  let guideToken: string;
  let guideId: string;
  let routeId: string;
  let touristToken: string;
  const bookingIds: string[] = [];

  const suffix = Date.now();
  const slug = `e2e-payments-route-${suffix}`;
  const guideEmail = `e2e.pguide.${suffix}@example.com`;
  const touristEmail = `e2e.ptourist.${suffix}@example.com`;
  const today = todayInLaPaz();

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  const acceptedBooking = async (daysAhead: number): Promise<string> => {
    const created = await request(server)
      .post('/api/bookings')
      .set(auth(touristToken))
      .send({
        routeId,
        guideProfileId: guideId,
        tourDate: addDays(today, daysAhead),
        startTime: '07:00',
        peopleCount: 2,
      })
      .expect(201);
    bookingIds.push(created.body.id);
    await request(server)
      .post(`/api/guides/me/bookings/${created.body.id}/accept`)
      .set(auth(guideToken))
      .expect(200);
    return created.body.id as string;
  };

  const startPayment = (bookingId: string, acceptTerms: unknown = true) =>
    request(server)
      .post(`/api/bookings/${bookingId}/payments`)
      .set(auth(touristToken))
      .send({ acceptTerms });

  const capture = (bookingId: string, paymentId: string) =>
    request(server)
      .post(`/api/bookings/${bookingId}/payments/${paymentId}/capture`)
      .set(auth(touristToken));

  const paidBooking = async (daysAhead: number): Promise<string> => {
    const bookingId = await acceptedBooking(daysAhead);
    const payment = await startPayment(bookingId).expect(201);
    await capture(bookingId, payment.body.id).expect(200);
    return bookingId;
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    configureApp(app, 'api');
    await app.init();
    server = app.getHttpServer();
    dataSource = app.get(DataSource);

    const login = await request(server)
      .post('/api/auth/login')
      .send({
        email: process.env.SEED_ADMIN_EMAIL,
        password: process.env.SEED_ADMIN_PASSWORD,
      })
      .expect(200);
    adminToken = login.body.accessToken;

    const route = await request(server)
      .post('/api/admin/routes')
      .set(auth(adminToken))
      .send({
        slug,
        nameEs: `Choro pagos ${suffix}`,
        nameEn: `Choro payments ${suffix}`,
        descriptionEs: 'Ruta de dos días para probar pagos.',
        descriptionEn: 'Two day route to test payments.',
        difficulty: 'MODERATE',
        autonomyLevel: 'GUIDE_RECOMMENDED',
        days: 2,
        distanceKm: 30,
        elevationGainM: 300,
        elevationLossM: 3000,
        maxAltitudeM: 4800,
        startTimeFrom: '06:00',
        startTimeTo: '08:00',
        howToGetThereEs: 'Minibús desde Villa Fátima.',
        howToGetThereEn: 'Minibus from Villa Fátima.',
        emergencyContacts: 'Policía 110',
        startLatitude: -16.3,
        startLongitude: -68.04,
        privatePrice: 150,
        groupMinPrice: 80,
        groupMaxPeople: 12,
      })
      .expect(201);
    routeId = route.body.id;
    for (const [order, minutes] of [
      [1, 0],
      [2, 300],
    ]) {
      await request(server)
        .post(`/api/admin/routes/${routeId}/points`)
        .set(auth(adminToken))
        .send({
          type: order === 1 ? 'START' : 'END',
          nameEs: `Punto ${order}`,
          nameEn: `Point ${order}`,
          latitude: -16.3,
          longitude: -68.04,
          isItineraryStop: true,
          stageOrder: order,
          dayNumber: order,
          minutesFromPrevious: minutes,
        })
        .expect(201);
    }
    await request(server)
      .patch(`/api/admin/routes/${routeId}/publication`)
      .set(auth(adminToken))
      .send({ isPublished: true })
      .expect(200);

    const guide = await request(server)
      .post('/api/auth/register/guide')
      .send({
        email: guideEmail,
        password: 'Montana2026',
        firstName: 'Juan',
        lastName: 'Mamani',
        nationalId: '6123456',
        languages: ['es'],
        yearsExperience: 5,
      })
      .expect(201);
    await confirmTestEmail(server, guide.body);
    guideToken = guide.body.accessToken;
    for (const type of ['NATIONAL_ID', 'GUIDE_CREDENTIAL', 'FIRST_AID']) {
      await request(server)
        .post('/api/guides/me/documents')
        .set(auth(guideToken))
        .field('type', type)
        .attach('file', PDF, 'document.pdf')
        .expect(201);
    }
    const me = await request(server)
      .get('/api/guides/me')
      .set(auth(guideToken))
      .expect(200);
    guideId = me.body.id;
    await request(server)
      .patch(`/api/admin/guides/${guideId}/verification`)
      .set(auth(adminToken))
      .send({ status: 'APPROVED' })
      .expect(200);
    const guideRoute = await request(server)
      .post('/api/guides/me/routes')
      .set(auth(guideToken))
      .send({ routeId })
      .expect(201);
    await request(server)
      .patch(`/api/admin/guide-routes/${guideRoute.body.id}`)
      .set(auth(adminToken))
      .send({ status: 'APPROVED' })
      .expect(200);
    await request(server)
      .put('/api/guides/me/schedule/slots')
      .set(auth(guideToken))
      .send({
        slots: [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
          weekday,
          timeFrom: '05:00',
          timeTo: '09:00',
        })),
      })
      .expect(200);

    const tourist = await request(server)
      .post('/api/auth/register')
      .send({
        email: touristEmail,
        password: 'Trekking2026',
        firstName: 'Ana',
        lastName: 'Müller',
        phone: '+41 79 123 45 67',
        country: 'CH',
      })
      .expect(201);
    await confirmTestEmail(server, tourist.body);
    touristToken = tourist.body.accessToken;
  });

  afterAll(async () => {
    if (bookingIds.length > 0) {
      const payments = await dataSource
        .getRepository(Payment)
        .createQueryBuilder('payment')
        .select('payment.id', 'id')
        .where('payment.booking_id IN (:...ids)', { ids: bookingIds })
        .getRawMany<{ id: string }>();
      if (payments.length > 0) {
        await dataSource
          .createQueryBuilder()
          .delete()
          .from(Refund)
          .where('payment_id IN (:...ids)', {
            ids: payments.map((payment) => payment.id),
          })
          .execute();
      }
      for (const entity of [Payment, Payout]) {
        await dataSource
          .createQueryBuilder()
          .delete()
          .from(entity)
          .where('booking_id IN (:...ids)', { ids: bookingIds })
          .execute();
      }
    }
    await dataSource.getRepository(Booking).delete({ guideProfileId: guideId });
    await dataSource.getRepository(GuideProfile).delete({ id: guideId });
    for (const email of [guideEmail, touristEmail]) {
      await dataSource.getRepository(User).delete({ email });
    }
    await dataSource.getRepository(Route).delete({ slug });
    await rm(join('uploads', 'guides', guideId), {
      recursive: true,
      force: true,
    });
    await app.close();
  });

  it('charges the accepted booking in dollars after the terms are accepted', async () => {
    const bookingId = await acceptedBooking(10);

    const noTerms = await startPayment(bookingId, false).expect(400);
    expect(noTerms.body.error).toBe('BAD_REQUEST');

    const started = await startPayment(bookingId).expect(201);
    expect(started.body).toMatchObject({
      status: 'PENDING',
      provider: 'FAKE',
      amountBob: 150,
      chargeCurrency: 'USD',
      exchangeRate: 6.96,
      chargedAmount: 21.55,
    });
    expect(started.body.approveUrl).toContain('token=FAKE-');

    const stored = await dataSource
      .getRepository(Booking)
      .findOneByOrFail({ id: bookingId });
    expect(stored.termsVersion).toBe('1.0');
    expect(stored.termsAcceptedAt).not.toBeNull();

    const captured = await capture(bookingId, started.body.id).expect(200);
    expect(captured.body.status).toBe('CAPTURED');
    const again = await capture(bookingId, started.body.id).expect(200);
    expect(again.body.status).toBe('CAPTURED');

    const booking = await request(server)
      .get(`/api/bookings/${bookingId}`)
      .set(auth(guideToken))
      .expect(200);
    expect(booking.body.status).toBe('CONFIRMED');
    expect(booking.body.confirmedAt).not.toBeNull();
    expect(booking.body.tourist.email).toBe(touristEmail);

    const payments = await request(server)
      .get(`/api/bookings/${bookingId}/payments`)
      .set(auth(touristToken))
      .expect(200);
    expect(
      payments.body.map((payment: { status: string }) => payment.status),
    ).toEqual(['CAPTURED']);
  });

  it('refunds 100% when the tourist cancels seven days or more before', async () => {
    const bookingId = bookingIds[0];
    const cancelled = await request(server)
      .post(`/api/bookings/${bookingId}/cancel`)
      .set(auth(touristToken))
      .send({ reason: 'Cambio de vuelo' })
      .expect(200);

    expect(cancelled.body.booking.status).toBe('CANCELLED_BY_TOURIST');
    expect(cancelled.body.refund).toMatchObject({
      amount: 21.55,
      currency: 'USD',
      reason: 'TOURIST_CANCELLATION',
      status: 'COMPLETED',
    });
    const payments = await request(server)
      .get(`/api/bookings/${bookingId}/payments`)
      .set(auth(touristToken))
      .expect(200);
    expect(payments.body[0].status).toBe('REFUNDED');
  });

  it('keeps the money and pays the guide when the tourist cancels late', async () => {
    const bookingId = await paidBooking(3);
    const cancelled = await request(server)
      .post(`/api/bookings/${bookingId}/cancel`)
      .set(auth(touristToken))
      .send({})
      .expect(200);
    expect(cancelled.body.booking.status).toBe('CANCELLED_BY_TOURIST');
    expect(cancelled.body.refund).toBeNull();

    const payouts = await request(server)
      .get('/api/guides/me/payouts')
      .set(auth(guideToken))
      .expect(200);
    expect(payouts.body.data).toMatchObject([
      {
        bookingId,
        grossAmount: 150,
        commissionRate: 15,
        commissionAmount: 22.5,
        netAmount: 127.5,
        status: 'PENDING',
      },
    ]);
  });

  it('does not charge once the payment window has closed', async () => {
    const bookingId = await acceptedBooking(5);
    const started = await startPayment(bookingId).expect(201);
    await dataSource
      .getRepository(Booking)
      .update({ id: bookingId }, { payBy: new Date(Date.now() - 60_000) });

    const late = await capture(bookingId, started.body.id).expect(409);
    expect(late.body.error).toBe('PAYMENT_WINDOW_CLOSED');

    const payments = await request(server)
      .get(`/api/bookings/${bookingId}/payments`)
      .set(auth(touristToken))
      .expect(200);
    expect(payments.body[0].status).toBe('PENDING');
  });

  it('refunds 100% when the guide cancels for weather', async () => {
    const bookingId = await paidBooking(8);
    const cancelled = await request(server)
      .post(`/api/guides/me/bookings/${bookingId}/cancel`)
      .set(auth(guideToken))
      .send({ reason: 'Nevada fuerte en la cumbre', weather: true })
      .expect(200);

    expect(cancelled.body.booking.status).toBe('CANCELLED_WEATHER');
    expect(cancelled.body.refund).toMatchObject({
      reason: 'WEATHER',
      status: 'COMPLETED',
    });
    expect(cancelled.body.booking.tourist.email).toBeNull();
  });

  it('completes finished tours and lets the admin settle the payout', async () => {
    const bookingId = await paidBooking(12);
    await dataSource.getRepository(Booking).update(
      { id: bookingId },
      {
        tourDate: addDays(today, -3),
        endsAt: new Date(Date.now() - 60 * 60_000),
      },
    );

    const completed = await app
      .get(BookingCompletionService)
      .completeFinished(new Date());
    expect(completed).toBeGreaterThanOrEqual(1);

    const booking = await request(server)
      .get(`/api/bookings/${bookingId}`)
      .set(auth(touristToken))
      .expect(200);
    expect(booking.body.status).toBe('COMPLETED');

    const pending = await request(server)
      .get('/api/admin/payouts')
      .query({ status: 'PENDING', limit: 100 })
      .set(auth(adminToken))
      .expect(200);
    const payout = pending.body.data.find(
      (item: { bookingId: string }) => item.bookingId === bookingId,
    );
    expect(payout).toMatchObject({
      netAmount: 127.5,
      routeNameEs: `Choro pagos ${suffix}`,
    });

    const paid = await request(server)
      .patch(`/api/admin/payouts/${payout.id}/paid`)
      .set(auth(adminToken))
      .expect(200);
    expect(paid.body.status).toBe('PAID');
    expect(paid.body.paidAt).not.toBeNull();

    const twice = await request(server)
      .patch(`/api/admin/payouts/${payout.id}/paid`)
      .set(auth(adminToken))
      .expect(409);
    expect(twice.body.error).toBe('PAYOUT_ALREADY_PAID');

    const tooLate = await request(server)
      .post(`/api/bookings/${bookingId}/cancel`)
      .set(auth(touristToken))
      .send({})
      .expect(409);
    expect(tooLate.body.error).toBe('INVALID_BOOKING_STATUS');
  });
});
