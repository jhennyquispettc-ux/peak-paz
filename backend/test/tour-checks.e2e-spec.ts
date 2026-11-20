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
import { Dispute } from './../src/modules/bookings/entities/dispute.entity.js';
import { GuideProfile } from './../src/modules/guides/entities/guide-profile.entity.js';
import { Payment } from './../src/modules/payments/entities/payment.entity.js';
import { Payout } from './../src/modules/payments/entities/payout.entity.js';
import { Refund } from './../src/modules/payments/entities/refund.entity.js';
import { BookingCompletionService } from './../src/modules/payments/services/booking-completion.service.js';
import { Route } from './../src/modules/routes/entities/route.entity.js';
import { CancellationReview } from './../src/modules/strikes/entities/cancellation-review.entity.js';
import { Strike } from './../src/modules/strikes/entities/strike.entity.js';
import { User } from './../src/modules/users/entities/user.entity.js';

const PDF = Buffer.from('%PDF-1.4\n%%EOF');
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

function laPazParts(instant: Date): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/La_Paz',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instant);
  const part = (type: string) =>
    parts.find((item) => item.type === type)!.value;
  return {
    date: `${part('year')}-${part('month')}-${part('day')}`,
    time: `${part('hour')}:${part('minute')}`,
  };
}

describe('Reconfirmation, tour start and disputes (e2e)', () => {
  let app: INestApplication<App>;
  let server: App;
  let dataSource: DataSource;
  let adminToken: string;
  let guideToken: string;
  let guideId: string;
  let routeId: string;
  let touristToken: string;
  const bookingIds: string[] = [];
  const booking: Record<string, string> = {};

  const suffix = Date.now();
  const slug = `e2e-checks-route-${suffix}`;
  const guideEmail = `e2e.cguide.${suffix}@example.com`;
  const touristEmail = `e2e.ctourist.${suffix}@example.com`;
  const today = todayInLaPaz();

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  const paidBooking = async (daysAhead: number): Promise<string> => {
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
    const payment = await request(server)
      .post(`/api/bookings/${created.body.id}/payments`)
      .set(auth(touristToken))
      .send({ acceptTerms: true })
      .expect(201);
    await request(server)
      .post(
        `/api/bookings/${created.body.id}/payments/${payment.body.id}/capture`,
      )
      .set(auth(touristToken))
      .expect(200);
    return created.body.id as string;
  };

  const moveTo = async (
    bookingId: string,
    startsAt: Date,
    endsAt: Date,
  ): Promise<void> => {
    const { date, time } = laPazParts(startsAt);
    await dataSource
      .getRepository(Booking)
      .update({ id: bookingId }, { tourDate: date, startTime: time, endsAt });
  };

  const guideStart = (bookingId: string) =>
    request(server)
      .post(`/api/guides/me/bookings/${bookingId}/start`)
      .set(auth(guideToken))
      .send({ latitude: -16.3505, longitude: -67.9195 });

  const touristStart = (bookingId: string) =>
    request(server)
      .post(`/api/bookings/${bookingId}/start`)
      .set(auth(touristToken));

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
        nameEs: `Chacaltaya controles ${suffix}`,
        nameEn: `Chacaltaya checks ${suffix}`,
        descriptionEs: 'Ruta de un día para probar el inicio del tour.',
        descriptionEn: 'One day route to test the tour start.',
        difficulty: 'MODERATE',
        autonomyLevel: 'GUIDE_RECOMMENDED',
        days: 1,
        distanceKm: 8,
        elevationGainM: 400,
        elevationLossM: 400,
        maxAltitudeM: 5395,
        startTimeFrom: '06:00',
        startTimeTo: '08:00',
        howToGetThereEs: 'Minibús desde El Alto.',
        howToGetThereEn: 'Minibus from El Alto.',
        emergencyContacts: 'Policía 110',
        startLatitude: -16.35,
        startLongitude: -67.92,
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
          latitude: -16.35,
          longitude: -67.92,
          isItineraryStop: true,
          stageOrder: order,
          dayNumber: 1,
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
        firstName: 'Mario',
        lastName: 'Condori',
        nationalId: '8123456',
        languages: ['es'],
        yearsExperience: 6,
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
        firstName: 'Tom',
        lastName: 'Becker',
        phone: '+49 151 2345678',
        country: 'DE',
      })
      .expect(201);
    await confirmTestEmail(server, tourist.body);
    touristToken = tourist.body.accessToken;

    booking.reconfirm = await paidBooking(8);
    booking.missed = await paidBooking(10);
    booking.happy = await paidBooking(12);
    booking.mismatch = await paidBooking(14);
    booking.noShow = await paidBooking(16);
  });

  afterAll(async () => {
    if (bookingIds.length > 0) {
      for (const entity of [Dispute, Strike, CancellationReview]) {
        await dataSource
          .createQueryBuilder()
          .delete()
          .from(entity)
          .where('booking_id IN (:...ids)', { ids: bookingIds })
          .execute();
      }
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

  it('lets the guide reconfirm only during the 72 hours before the start', async () => {
    const early = await request(server)
      .post(`/api/guides/me/bookings/${booking.reconfirm}/reconfirm`)
      .set(auth(guideToken))
      .expect(409);
    expect(early.body.error).toBe('RECONFIRMATION_NOT_OPEN');

    const startsAt = new Date(Date.now() + 48 * HOUR);
    await moveTo(
      booking.reconfirm,
      startsAt,
      new Date(startsAt.getTime() + 5 * HOUR),
    );

    const reconfirmed = await request(server)
      .post(`/api/guides/me/bookings/${booking.reconfirm}/reconfirm`)
      .set(auth(guideToken))
      .expect(200);
    expect(reconfirmed.body.reconfirmedAt).not.toBeNull();

    const twice = await request(server)
      .post(`/api/guides/me/bookings/${booking.reconfirm}/reconfirm`)
      .set(auth(guideToken))
      .expect(409);
    expect(twice.body.error).toBe('ALREADY_RECONFIRMED');

    const tooEarly = await guideStart(booking.reconfirm).expect(409);
    expect(tooEarly.body.error).toBe('START_WINDOW_CLOSED');
  });

  it('refunds the tourist in full when the guide missed the reconfirmation', async () => {
    const startsAt = new Date(Date.now() + 20 * HOUR);
    await moveTo(
      booking.missed,
      startsAt,
      new Date(startsAt.getTime() + 5 * HOUR),
    );

    const cancelled = await request(server)
      .post(`/api/bookings/${booking.missed}/cancel`)
      .set(auth(touristToken))
      .send({ reason: 'El guía no reconfirmó' })
      .expect(200);
    expect(cancelled.body.booking.status).toBe('CANCELLED_BY_TOURIST');
    expect(cancelled.body.refund).toMatchObject({
      reason: 'TOURIST_CANCELLATION',
      status: 'COMPLETED',
    });
  });

  it('completes the tour and pays the guide when both confirm the start', async () => {
    const startsAt = new Date(Date.now() - 10 * MINUTE);
    await moveTo(
      booking.happy,
      startsAt,
      new Date(startsAt.getTime() + 5 * HOUR),
    );

    const started = await guideStart(booking.happy).expect(200);
    expect(started.body.status).toBe('IN_PROGRESS');
    expect(started.body.guideStartedAt).not.toBeNull();
    const again = await guideStart(booking.happy).expect(409);
    expect(again.body.error).toBe('ALREADY_STARTED');

    const confirmed = await touristStart(booking.happy).expect(200);
    expect(confirmed.body.touristStartedAt).not.toBeNull();

    const tooSoon = await request(server)
      .post(`/api/bookings/${booking.happy}/cancel`)
      .set(auth(touristToken))
      .send({})
      .expect(409);
    expect(tooSoon.body.error).toBe('INVALID_BOOKING_STATUS');

    await dataSource
      .getRepository(Booking)
      .update(
        { id: booking.happy },
        { endsAt: new Date(Date.now() - 25 * HOUR) },
      );
    const summary = await app
      .get(BookingCompletionService)
      .completeFinished(new Date());
    expect(summary.completed).toBeGreaterThanOrEqual(1);

    const payouts = await request(server)
      .get('/api/guides/me/payouts')
      .set(auth(guideToken))
      .expect(200);
    expect(
      payouts.body.data.some(
        (item: { bookingId: string }) => item.bookingId === booking.happy,
      ),
    ).toBe(true);
  });

  it('opens a dispute when only the guide confirmed and lets the admin settle it', async () => {
    const startsAt = new Date(Date.now() - 10 * MINUTE);
    await moveTo(
      booking.mismatch,
      startsAt,
      new Date(startsAt.getTime() + 5 * HOUR),
    );
    const started = await guideStart(booking.mismatch).expect(200);
    expect(started.body.status).toBe('IN_PROGRESS');

    await dataSource
      .getRepository(Booking)
      .update(
        { id: booking.mismatch },
        { endsAt: new Date(Date.now() - 25 * HOUR) },
      );
    const summary = await app
      .get(BookingCompletionService)
      .completeFinished(new Date());
    expect(summary.disputed).toBeGreaterThanOrEqual(1);

    const open = await request(server)
      .get('/api/admin/disputes')
      .query({ status: 'OPEN', limit: 100 })
      .set(auth(adminToken))
      .expect(200);
    const dispute = open.body.data.find(
      (item: { bookingId: string }) => item.bookingId === booking.mismatch,
    );
    expect(dispute).toMatchObject({
      reason: 'START_MISMATCH',
      openedBy: 'SYSTEM',
      touristStartedAt: null,
      guideName: 'Mario Condori',
    });
    expect(dispute.guideStartDistanceM).toBeGreaterThan(0);
    expect(dispute.guideStartDistanceM).toBeLessThan(200);

    const resolved = await request(server)
      .post(`/api/admin/disputes/${dispute.id}/resolve`)
      .set(auth(adminToken))
      .send({
        decision: 'TOUR_HAPPENED',
        resolution: 'El guía marcó el inicio en el punto de partida.',
      })
      .expect(200);
    expect(resolved.body).toMatchObject({
      dispute: { status: 'RESOLVED', bookingStatus: 'COMPLETED' },
      refund: null,
      strike: null,
    });

    const payouts = await request(server)
      .get('/api/guides/me/payouts')
      .set(auth(guideToken))
      .expect(200);
    expect(
      payouts.body.data.some(
        (item: { bookingId: string }) => item.bookingId === booking.mismatch,
      ),
    ).toBe(true);
  });

  it('refunds and gives a double strike when the guide did not show up', async () => {
    const early = new Date(Date.now() - 10 * MINUTE);
    await moveTo(booking.noShow, early, new Date(early.getTime() + 5 * HOUR));
    const notYet = await request(server)
      .post(`/api/bookings/${booking.noShow}/no-show`)
      .set(auth(touristToken))
      .send({ description: 'El guía todavía no llega al punto de partida.' })
      .expect(409);
    expect(notYet.body.error).toBe('NO_SHOW_REPORT_NOT_ALLOWED');

    const late = new Date(Date.now() - 40 * MINUTE);
    await moveTo(booking.noShow, late, new Date(late.getTime() + 5 * HOUR));
    const reported = await request(server)
      .post(`/api/bookings/${booking.noShow}/no-show`)
      .set(auth(touristToken))
      .send({ description: 'Esperamos 40 minutos y el guía no llegó.' })
      .expect(201);
    expect(reported.body).toMatchObject({
      reason: 'GUIDE_NO_SHOW',
      openedBy: 'TOURIST',
      status: 'OPEN',
    });
    const twice = await request(server)
      .post(`/api/bookings/${booking.noShow}/no-show`)
      .set(auth(touristToken))
      .send({ description: 'Sigo esperando al guía en el punto.' })
      .expect(409);
    expect(twice.body.error).toBe('DISPUTE_ALREADY_OPEN');

    const resolved = await request(server)
      .post(`/api/admin/disputes/${reported.body.id}/resolve`)
      .set(auth(adminToken))
      .send({
        decision: 'GUIDE_NO_SHOW',
        resolution: 'El guía no marcó el inicio ni respondió.',
      })
      .expect(200);
    expect(resolved.body).toMatchObject({
      dispute: { status: 'RESOLVED', bookingStatus: 'CANCELLED_BY_PROVIDER' },
      refund: { reason: 'PROVIDER_CANCELLATION', status: 'COMPLETED' },
      strike: { reason: 'NO_SHOW', weight: 2, status: 'ACTIVE' },
      activeStrikes: 2,
      sanction: 'HIDDEN',
    });

    const again = await request(server)
      .post(`/api/admin/disputes/${reported.body.id}/resolve`)
      .set(auth(adminToken))
      .send({ decision: 'TOUR_HAPPENED', resolution: 'Segundo intento.' })
      .expect(409);
    expect(again.body.error).toBe('DISPUTE_RESOLVED');
  });
});
