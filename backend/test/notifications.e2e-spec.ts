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
import { Booking } from './../src/modules/bookings/entities/booking.entity.js';
import { Dispute } from './../src/modules/bookings/entities/dispute.entity.js';
import { TourChecksService } from './../src/modules/bookings/services/tour-checks.service.js';
import { GuideProfile } from './../src/modules/guides/entities/guide-profile.entity.js';
import { Payment } from './../src/modules/payments/entities/payment.entity.js';
import { Payout } from './../src/modules/payments/entities/payout.entity.js';
import { Refund } from './../src/modules/payments/entities/refund.entity.js';
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

describe('Notifications in the app and by email (e2e)', () => {
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
  const slug = `e2e-notice-route-${suffix}`;
  const guideEmail = `e2e.nguide.${suffix}@example.com`;
  const touristEmail = `e2e.ntourist.${suffix}@example.com`;
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
        nameEs: `Chacaltaya avisos ${suffix}`,
        nameEn: `Chacaltaya notices ${suffix}`,
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
        nationalId: '3123456',
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

    booking.alerted = await paidBooking(8);
    booking.cancelled = await paidBooking(10);
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

  const inbox = async (token: string) =>
    (
      await request(server)
        .get('/api/notifications/me')
        .query({ limit: 100 })
        .set(auth(token))
        .expect(200)
    ).body as {
      data: { id: string; type: string; subject: string; link: string }[];
      unread: number;
    };

  const typesOf = async (token: string) =>
    (await inbox(token)).data.map((item) => item.type);

  const mailTo = async (email: string, subject: string): Promise<boolean> => {
    const mailbox = process.env.MAILPIT_TEST_URL;
    if (!mailbox) return false;
    for (let attempt = 0; attempt < 80; attempt++) {
      const response = await fetch(
        `${mailbox}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`,
      );
      const data = (await response.json()) as {
        messages?: { Subject: string }[];
      };
      if (data.messages?.some((message) => message.Subject === subject)) {
        return true;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return false;
  };

  it('notifies each side through the booking and sends the email', async () => {
    const guideTypes = await typesOf(guideToken);
    expect(guideTypes).toEqual(
      expect.arrayContaining(['BOOKING_REQUESTED', 'NEW_PAID_BOOKING']),
    );
    const tourist = await inbox(touristToken);
    expect(tourist.data.map((item) => item.type)).toEqual(
      expect.arrayContaining(['BOOKING_ACCEPTED', 'BOOKING_CONFIRMED']),
    );
    const confirmed = tourist.data.find(
      (item) =>
        item.type === 'BOOKING_CONFIRMED' &&
        item.link === `/reservas/${booking.alerted}`,
    );
    expect(confirmed).toBeDefined();
    expect(tourist.unread).toBeGreaterThanOrEqual(2);

    expect(await mailTo(touristEmail, confirmed!.subject)).toBe(true);
  });

  it('marks notifications as read one by one or all at once', async () => {
    const before = await inbox(touristToken);
    await request(server)
      .patch(`/api/notifications/me/${before.data[0].id}/read`)
      .set(auth(touristToken))
      .expect(204);
    expect((await inbox(touristToken)).unread).toBe(before.unread - 1);

    await request(server)
      .patch(`/api/notifications/me/${before.data[0].id}/read`)
      .set(auth(guideToken))
      .expect(404);

    const all = await request(server)
      .post('/api/notifications/me/read-all')
      .set(auth(touristToken))
      .expect(200);
    expect(all.body.updated).toBe(before.unread - 1);
    const unread = await request(server)
      .get('/api/notifications/me')
      .query({ unread: true })
      .set(auth(touristToken))
      .expect(200);
    expect(unread.body.data).toHaveLength(0);
  });

  it('warns the tourist once when the guide misses the reconfirmation', async () => {
    const startsAt = new Date(Date.now() + 20 * HOUR);
    await moveTo(
      booking.alerted,
      startsAt,
      new Date(startsAt.getTime() + 5 * HOUR),
    );
    const service = app.get(TourChecksService);
    expect(await service.alertMissedReconfirmations(new Date())).toBe(1);
    expect(await service.alertMissedReconfirmations(new Date())).toBe(0);
    const types = await typesOf(touristToken);
    expect(
      types.filter((type) => type === 'RECONFIRMATION_MISSED'),
    ).toHaveLength(1);
  });

  it('tells the tourist and the administrators when the guide cancels', async () => {
    await request(server)
      .post(`/api/guides/me/bookings/${booking.cancelled}/cancel`)
      .set(auth(guideToken))
      .send({ reason: 'Me torcí el tobillo entrenando' })
      .expect(200);
    const tourist = await inbox(touristToken);
    const cancelled = tourist.data.find(
      (item) => item.type === 'BOOKING_CANCELLED',
    )!;
    expect(cancelled.subject).toContain('cancelada');
    const admin = await inbox(adminToken);
    expect(admin.data.map((item) => item.type)).toContain('CASE_OPENED');
  });
});
