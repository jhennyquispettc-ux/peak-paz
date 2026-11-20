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
import { BookingStatus } from './../src/modules/bookings/bookings.enums.js';
import { Booking } from './../src/modules/bookings/entities/booking.entity.js';
import { GuideProfile } from './../src/modules/guides/entities/guide-profile.entity.js';
import { Payment } from './../src/modules/payments/entities/payment.entity.js';
import { Payout } from './../src/modules/payments/entities/payout.entity.js';
import { Refund } from './../src/modules/payments/entities/refund.entity.js';
import { BookingCompletionService } from './../src/modules/payments/services/booking-completion.service.js';
import { SuspendedGuideBookingsService } from './../src/modules/payments/services/suspended-guide-bookings.service.js';
import { Route } from './../src/modules/routes/entities/route.entity.js';
import { CancellationReview } from './../src/modules/strikes/entities/cancellation-review.entity.js';
import { Strike } from './../src/modules/strikes/entities/strike.entity.js';
import { User } from './../src/modules/users/entities/user.entity.js';

const PDF = Buffer.from('%PDF-1.4\n%%EOF');
const DAY = 24 * 60 * 60 * 1000;

describe('Guide cancellations, strikes and fines (e2e)', () => {
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
  const reviewIds: string[] = [];
  let firstStrikeId: string;

  const suffix = Date.now();
  const slug = `e2e-sanctions-route-${suffix}`;
  const guideEmail = `e2e.sguide.${suffix}@example.com`;
  const touristEmail = `e2e.stourist.${suffix}@example.com`;
  const guidePassword = 'Montana2026';
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

  const paidBooking = async (daysAhead: number): Promise<string> => {
    const bookingId = await acceptedBooking(daysAhead);
    const payment = await request(server)
      .post(`/api/bookings/${bookingId}/payments`)
      .set(auth(touristToken))
      .send({ acceptTerms: true })
      .expect(201);
    await request(server)
      .post(`/api/bookings/${bookingId}/payments/${payment.body.id}/capture`)
      .set(auth(touristToken))
      .expect(200);
    return bookingId;
  };

  const resolve = (reviewId: string, body: Record<string, unknown>) =>
    request(server)
      .post(`/api/admin/cancellation-reviews/${reviewId}/resolve`)
      .set(auth(adminToken))
      .send({ resolution: 'Revisado por el administrador', ...body });

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
        nameEs: `Takesi sanciones ${suffix}`,
        nameEn: `Takesi sanctions ${suffix}`,
        descriptionEs: 'Ruta de un día para probar sanciones.',
        descriptionEn: 'One day route to test sanctions.',
        difficulty: 'MODERATE',
        autonomyLevel: 'GUIDE_RECOMMENDED',
        days: 1,
        distanceKm: 20,
        elevationGainM: 300,
        elevationLossM: 2000,
        maxAltitudeM: 4650,
        startTimeFrom: '06:00',
        startTimeTo: '08:00',
        howToGetThereEs: 'Minibús desde Villa Fátima.',
        howToGetThereEn: 'Minibus from Villa Fátima.',
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
        password: guidePassword,
        firstName: 'Rosa',
        lastName: 'Quispe',
        nationalId: '7123456',
        languages: ['es'],
        yearsExperience: 4,
      })
      .expect(201);
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
        firstName: 'Lea',
        lastName: 'Martin',
        phone: '+33 6 12 34 56 78',
        country: 'FR',
      })
      .expect(201);
    touristToken = tourist.body.accessToken;

    booking.sick = await paidBooking(8);
    booking.unpaid = await acceptedBooking(10);
    booking.third = await paidBooking(12);
    booking.future = await paidBooking(14);
    booking.finished = await paidBooking(16);
  });

  afterAll(async () => {
    if (bookingIds.length > 0) {
      for (const entity of [Strike, CancellationReview]) {
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
    for (const folder of ['guides', 'cancellations']) {
      await rm(join('uploads', folder, guideId), {
        recursive: true,
        force: true,
      });
    }
    await app.close();
  });

  it('refunds the tourist and opens a review with the evidence when the guide cancels', async () => {
    const cancelled = await request(server)
      .post(`/api/guides/me/bookings/${booking.sick}/cancel`)
      .set(auth(guideToken))
      .field('reason', 'Tengo fiebre alta y no puedo subir')
      .field('weather', 'false')
      .attach('evidence', PDF, 'certificado.pdf')
      .expect(200);

    expect(cancelled.body.booking.status).toBe('CANCELLED_BY_PROVIDER');
    expect(cancelled.body.refund).toMatchObject({
      reason: 'PROVIDER_CANCELLATION',
      status: 'COMPLETED',
    });
    expect(cancelled.body.reviewId).toEqual(expect.any(String));
    reviewIds.push(cancelled.body.reviewId);

    const pending = await request(server)
      .get('/api/admin/cancellation-reviews')
      .query({ status: 'PENDING', limit: 100 })
      .set(auth(adminToken))
      .expect(200);
    expect(
      pending.body.data.some(
        (item: { id: string }) => item.id === cancelled.body.reviewId,
      ),
    ).toBe(true);

    const detail = await request(server)
      .get(`/api/admin/cancellation-reviews/${cancelled.body.reviewId}`)
      .set(auth(adminToken))
      .expect(200);
    expect(detail.body).toMatchObject({
      bookingId: booking.sick,
      hasEvidence: true,
      status: 'PENDING',
      guideName: 'Rosa Quispe',
      cancellationReason: 'Tengo fiebre alta y no puedo subir',
      guideActiveStrikes: 0,
    });
    expect(detail.body.hoursBeforeStart).toBeGreaterThan(24 * 6);

    const evidence = await request(server)
      .get(
        `/api/admin/cancellation-reviews/${cancelled.body.reviewId}/evidence`,
      )
      .set(auth(adminToken))
      .expect(200);
    expect(evidence.headers['content-type']).toContain('application/pdf');

    await request(server)
      .get('/api/admin/cancellation-reviews')
      .set(auth(guideToken))
      .expect(403);
  });

  it('validates the fine before resolving', async () => {
    const [reviewId] = reviewIds;
    const missing = await resolve(reviewId, {
      decision: 'STRIKE_AND_FINE',
    }).expect(400);
    expect(missing.body.error).toBe('FINE_PERCENT_REQUIRED');

    const tooHigh = await resolve(reviewId, {
      decision: 'STRIKE_AND_FINE',
      finePercent: 30,
    }).expect(400);
    expect(tooHigh.body.error).toBe('FINE_TOO_HIGH');

    const notAllowed = await resolve(reviewId, {
      decision: 'STRIKE',
      finePercent: 10,
    }).expect(400);
    expect(notAllowed.body.error).toBe('FINE_NOT_ALLOWED');
  });

  it('gives a strike with a fine and shows it to the guide', async () => {
    const [reviewId] = reviewIds;
    const resolved = await resolve(reviewId, {
      decision: 'STRIKE_AND_FINE',
      finePercent: 20,
    }).expect(200);

    expect(resolved.body.review).toMatchObject({
      status: 'RESOLVED',
      decision: 'STRIKE_AND_FINE',
      fineAmount: 30,
      fineSettled: 0,
    });
    expect(resolved.body.strike).toMatchObject({
      reason: 'CANCELLED_WITHOUT_WEATHER',
      status: 'ACTIVE',
      guideProfileId: guideId,
    });
    expect(resolved.body).toMatchObject({
      activeStrikes: 1,
      sanction: 'NONE',
      hiddenUntil: null,
    });
    firstStrikeId = resolved.body.strike.id;

    const twice = await resolve(reviewId, { decision: 'NO_SANCTION' }).expect(
      409,
    );
    expect(twice.body.error).toBe('CANCELLATION_REVIEW_RESOLVED');

    const sanctions = await request(server)
      .get('/api/guides/me/sanctions')
      .set(auth(guideToken))
      .expect(200);
    expect(sanctions.body).toMatchObject({
      activeStrikes: 1,
      strikesToHide: 2,
      strikesToSuspend: 3,
      hiddenUntil: null,
      pendingFines: 30,
    });
    expect(sanctions.body.strikes).toHaveLength(1);
  });

  it('takes the fine out of the next payout', async () => {
    await dataSource.getRepository(Booking).update(
      { id: booking.finished },
      {
        tourDate: addDays(today, -2),
        endsAt: new Date(Date.now() - 25 * 60 * 60_000),
        status: BookingStatus.IN_PROGRESS,
        guideStartedAt: new Date(Date.now() - 30 * 60 * 60_000),
        guideStartLatitude: -16.35,
        guideStartLongitude: -67.92,
        guideStartDistanceM: 0,
        touristStartedAt: new Date(Date.now() - 30 * 60 * 60_000),
      },
    );
    await app.get(BookingCompletionService).completeFinished(new Date());

    const payouts = await request(server)
      .get('/api/guides/me/payouts')
      .set(auth(guideToken))
      .expect(200);
    const payout = payouts.body.data.find(
      (item: { bookingId: string }) => item.bookingId === booking.finished,
    );
    expect(payout).toMatchObject({
      grossAmount: 150,
      commissionAmount: 22.5,
      penaltyDeduction: 30,
      netAmount: 97.5,
    });

    const sanctions = await request(server)
      .get('/api/guides/me/sanctions')
      .set(auth(guideToken))
      .expect(200);
    expect(sanctions.body.pendingFines).toBe(0);
  });

  it('hides the guide from the catalog at the second strike', async () => {
    const cancelled = await request(server)
      .post(`/api/guides/me/bookings/${booking.unpaid}/cancel`)
      .set(auth(guideToken))
      .send({ reason: 'Me salió otro trabajo ese día' })
      .expect(200);
    expect(cancelled.body.refund).toBeNull();
    reviewIds.push(cancelled.body.reviewId);

    const detail = await request(server)
      .get(`/api/admin/cancellation-reviews/${cancelled.body.reviewId}`)
      .set(auth(adminToken))
      .expect(200);
    expect(detail.body).toMatchObject({
      hasEvidence: false,
      guideActiveStrikes: 1,
    });
    const noEvidence = await request(server)
      .get(
        `/api/admin/cancellation-reviews/${cancelled.body.reviewId}/evidence`,
      )
      .set(auth(adminToken))
      .expect(404);
    expect(noEvidence.body.error).toBe('EVIDENCE_NOT_FOUND');

    const resolved = await resolve(cancelled.body.reviewId, {
      decision: 'STRIKE',
    }).expect(200);
    expect(resolved.body).toMatchObject({
      activeStrikes: 2,
      sanction: 'HIDDEN',
    });
    const hiddenFor =
      new Date(resolved.body.hiddenUntil).getTime() - Date.now();
    expect(hiddenFor).toBeGreaterThan(29 * DAY);
    expect(hiddenFor).toBeLessThanOrEqual(30 * DAY);

    const guides = await request(server)
      .get(`/api/routes/${slug}/guides`)
      .expect(200);
    expect(
      guides.body.some((guide: { id: string }) => guide.id === guideId),
    ).toBe(false);
    await request(server).get(`/api/guides/${guideId}`).expect(404);
  });

  it('suspends the guide at the third strike and cancels the open bookings', async () => {
    const cancelled = await request(server)
      .post(`/api/guides/me/bookings/${booking.third}/cancel`)
      .set(auth(guideToken))
      .send({ reason: 'No tengo cómo llegar al punto de partida' })
      .expect(200);
    const resolved = await resolve(cancelled.body.reviewId, {
      decision: 'STRIKE',
    }).expect(200);
    expect(resolved.body).toMatchObject({
      activeStrikes: 3,
      sanction: 'SUSPENDED',
    });

    const login = await request(server)
      .post('/api/auth/login')
      .send({ email: guideEmail, password: guidePassword })
      .expect(403);
    expect(login.body.error).toBe('USER_SUSPENDED');

    const cancelledByJob = await app
      .get(SuspendedGuideBookingsService)
      .cancelOpenBookings(new Date());
    expect(cancelledByJob).toBeGreaterThanOrEqual(1);

    const future = await request(server)
      .get(`/api/bookings/${booking.future}`)
      .set(auth(touristToken))
      .expect(200);
    expect(future.body.status).toBe('CANCELLED_BY_PROVIDER');
    const refunds = await dataSource
      .getRepository(Refund)
      .createQueryBuilder('refund')
      .innerJoin('refund.payment', 'payment')
      .where('payment.booking_id = :id', { id: booking.future })
      .getMany();
    expect(refunds).toHaveLength(1);
  });

  it('lets the admin revert an active strike only once', async () => {
    const strikes = await request(server)
      .get('/api/admin/strikes')
      .query({ guideProfileId: guideId })
      .set(auth(adminToken))
      .expect(200);
    expect(strikes.body.meta.total).toBe(3);

    const reverted = await request(server)
      .post(`/api/admin/strikes/${firstStrikeId}/revert`)
      .set(auth(adminToken))
      .expect(200);
    expect(reverted.body.status).toBe('REVERTED');

    const twice = await request(server)
      .post(`/api/admin/strikes/${firstStrikeId}/revert`)
      .set(auth(adminToken))
      .expect(409);
    expect(twice.body.error).toBe('STRIKE_NOT_ACTIVE');
  });
});
