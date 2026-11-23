import { passInterview } from './helpers/pass-interview.js';
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
import { BookingStatus } from './../src/modules/bookings/bookings.enums.js';
import { Booking } from './../src/modules/bookings/entities/booking.entity.js';
import { Dispute } from './../src/modules/bookings/entities/dispute.entity.js';
import { GuideProfile } from './../src/modules/guides/entities/guide-profile.entity.js';
import { Payment } from './../src/modules/payments/entities/payment.entity.js';
import { Payout } from './../src/modules/payments/entities/payout.entity.js';
import { Refund } from './../src/modules/payments/entities/refund.entity.js';
import { Review } from './../src/modules/reviews/entities/review.entity.js';
import { Route } from './../src/modules/routes/entities/route.entity.js';
import { CancellationReview } from './../src/modules/strikes/entities/cancellation-review.entity.js';
import { Strike } from './../src/modules/strikes/entities/strike.entity.js';
import { User } from './../src/modules/users/entities/user.entity.js';

const PDF = Buffer.from('%PDF-1.4\n%%EOF');
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

describe('Reviews of guides (e2e)', () => {
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
  const slug = `e2e-review-route-${suffix}`;
  const guideEmail = `e2e.vguide.${suffix}@example.com`;
  const touristEmail = `e2e.vtourist.${suffix}@example.com`;
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
        nameEs: `Chacaltaya reseñas ${suffix}`,
        nameEn: `Chacaltaya reviews ${suffix}`,
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
        nationalId: '5123456',
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
    await passInterview(server, adminToken, 'GUIDE', guideId);
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

    booking.first = await paidBooking(8);
    booking.second = await paidBooking(10);
    booking.late = await paidBooking(12);
  });

  afterAll(async () => {
    if (bookingIds.length > 0) {
      for (const entity of [Review, Dispute, Strike, CancellationReview]) {
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

  const complete = async (bookingId: string, endedAgo: number) => {
    await dataSource.getRepository(Booking).update(
      { id: bookingId },
      {
        status: BookingStatus.COMPLETED,
        endsAt: new Date(Date.now() - endedAgo),
      },
    );
  };

  const review = (bookingId: string, rating: number, comment?: string) =>
    request(server)
      .post(`/api/bookings/${bookingId}/review`)
      .set(auth(touristToken))
      .send({ rating, comment });

  const guideRating = async () =>
    (
      await request(server)
        .get('/api/guides/me')
        .set(auth(guideToken))
        .expect(200)
    ).body as { ratingAverage: number; reviewsCount: number };

  it('accepts a review only once and only for a completed tour', async () => {
    const early = await review(booking.first, 5).expect(409);
    expect(early.body.error).toBe('INVALID_BOOKING_STATUS');

    await complete(booking.first, HOUR);
    const created = await review(
      booking.first,
      5,
      'Mario nos cuidó mucho con la altura.',
    ).expect(201);
    expect(created.body).toMatchObject({
      rating: 5,
      comment: 'Mario nos cuidó mucho con la altura.',
      touristFirstName: 'Tom',
      touristCountry: 'DE',
    });

    const twice = await review(booking.first, 4).expect(409);
    expect(twice.body.error).toBe('REVIEW_ALREADY_EXISTS');

    const mine = await request(server)
      .get(`/api/bookings/${booking.first}/review`)
      .set(auth(touristToken))
      .expect(200);
    expect(mine.body.rating).toBe(5);

    const invalid = await review(booking.second, 6).expect(400);
    expect(invalid.body.error).toBeDefined();
  });

  it('updates the average of the guide and lists the reviews publicly', async () => {
    await complete(booking.second, 2 * HOUR);
    await review(booking.second, 2).expect(201);

    expect(await guideRating()).toMatchObject({
      ratingAverage: 3.5,
      reviewsCount: 2,
    });
    const list = await request(server)
      .get(`/api/guides/${guideId}/reviews`)
      .expect(200);
    expect(list.body.meta.total).toBe(2);
    expect(list.body.data[0]).toMatchObject({ rating: 2 });
  });

  it('closes the review window 30 days after the tour', async () => {
    await complete(booking.late, 31 * 24 * HOUR);
    const late = await review(booking.late, 4).expect(409);
    expect(late.body.error).toBe('REVIEW_WINDOW_CLOSED');
  });

  it('lets the admin hide a review and recalculates the average', async () => {
    const all = await request(server)
      .get('/api/admin/reviews')
      .query({ hidden: false, limit: 100 })
      .set(auth(adminToken))
      .expect(200);
    const low = all.body.data.find(
      (item: { bookingId: string }) => item.bookingId === booking.second,
    );
    expect(low).toMatchObject({
      providerKind: 'GUIDE',
      guideName: 'Mario Condori',
      hiddenAt: null,
    });

    const noReason = await request(server)
      .patch(`/api/admin/reviews/${low.id}/visibility`)
      .set(auth(adminToken))
      .send({ hidden: true })
      .expect(400);
    expect(noReason.body.error).toBe('HIDDEN_REASON_REQUIRED');

    const hidden = await request(server)
      .patch(`/api/admin/reviews/${low.id}/visibility`)
      .set(auth(adminToken))
      .send({ hidden: true, reason: 'Contiene insultos al guía.' })
      .expect(200);
    expect(hidden.body.hiddenAt).not.toBeNull();
    expect(await guideRating()).toMatchObject({
      ratingAverage: 5,
      reviewsCount: 1,
    });
    const visible = await request(server)
      .get(`/api/guides/${guideId}/reviews`)
      .expect(200);
    expect(visible.body.meta.total).toBe(1);

    await request(server)
      .patch(`/api/admin/reviews/${low.id}/visibility`)
      .set(auth(adminToken))
      .send({ hidden: false })
      .expect(200);
    expect(await guideRating()).toMatchObject({
      ratingAverage: 3.5,
      reviewsCount: 2,
    });

    await request(server)
      .patch(`/api/admin/reviews/${low.id}/visibility`)
      .set(auth(touristToken))
      .send({ hidden: false })
      .expect(403);
  });
});
