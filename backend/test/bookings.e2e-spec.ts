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
import { BookingExpirationService } from './../src/modules/bookings/services/booking-expiration.service.js';
import { GuideProfile } from './../src/modules/guides/entities/guide-profile.entity.js';
import { Route } from './../src/modules/routes/entities/route.entity.js';
import { User } from './../src/modules/users/entities/user.entity.js';

const PDF = Buffer.from('%PDF-1.4\n%%EOF');

describe('Guide bookings (e2e)', () => {
  let app: INestApplication<App>;
  let server: App;
  let dataSource: DataSource;
  let adminToken: string;
  let guideToken: string;
  let guideId: string;
  let routeId: string;
  let touristAToken: string;
  let touristBToken: string;
  let bookingA: string;
  let bookingB: string;

  const suffix = Date.now();
  const slug = `e2e-booking-route-${suffix}`;
  const guideEmail = `e2e.bguide.${suffix}@example.com`;
  const touristAEmail = `e2e.btourist.a.${suffix}@example.com`;
  const touristBEmail = `e2e.btourist.b.${suffix}@example.com`;
  const day = addDays(todayInLaPaz(), 10);

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  const requestBooking = (
    token: string,
    overrides: Record<string, unknown> = {},
  ) =>
    request(server)
      .post('/api/bookings')
      .set(auth(token))
      .send({
        routeId,
        guideProfileId: guideId,
        tourDate: day,
        startTime: '07:00',
        peopleCount: 2,
        ...overrides,
      });

  const registerTourist = async (email: string) => {
    const response = await request(server)
      .post('/api/auth/register')
      .send({
        email,
        password: 'Trekking2026',
        firstName: 'Ana',
        lastName: 'Müller',
        phone: '+41 79 123 45 67',
        country: 'CH',
        language: 'en',
      })
      .expect(201);
    return response.body.accessToken as string;
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
        nameEs: `Takesi reservas ${suffix}`,
        nameEn: `Takesi bookings ${suffix}`,
        descriptionEs: 'Ruta de dos días para probar reservas.',
        descriptionEn: 'Two day route to test bookings.',
        difficulty: 'MODERATE',
        autonomyLevel: 'GUIDE_RECOMMENDED',
        days: 2,
        distanceKm: 23,
        elevationGainM: 300,
        elevationLossM: 3000,
        maxAltitudeM: 4650,
        startTimeFrom: '06:00',
        startTimeTo: '08:00',
        howToGetThereEs: 'Minibús desde Villa Fátima.',
        howToGetThereEn: 'Minibus from Villa Fátima.',
        emergencyContacts: 'Policía 110',
        startLatitude: -16.4,
        startLongitude: -67.95,
        privatePrice: 150,
        privateMaxPeople: 4,
        groupMinPrice: 80,
        groupMaxPeople: 12,
      })
      .expect(201);
    routeId = route.body.id;
    for (const order of [1, 2]) {
      await request(server)
        .post(`/api/admin/routes/${routeId}/points`)
        .set(auth(adminToken))
        .send({
          type: order === 1 ? 'START' : 'END',
          nameEs: `Punto ${order}`,
          nameEn: `Point ${order}`,
          latitude: -16.4,
          longitude: -67.95,
          isItineraryStop: true,
          stageOrder: order,
          dayNumber: order,
          minutesFromPrevious: 0,
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
        languages: ['es', 'en'],
        yearsExperience: 5,
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

    touristAToken = await registerTourist(touristAEmail);
    touristBToken = await registerTourist(touristBEmail);
  });

  afterAll(async () => {
    await request(server)
      .patch('/api/admin/settings/RESPONSE_WINDOW_MIN')
      .set(auth(adminToken))
      .send({ value: 120 });
    await dataSource.getRepository(Booking).delete({ guideProfileId: guideId });
    await dataSource.getRepository(GuideProfile).delete({ id: guideId });
    for (const email of [guideEmail, touristAEmail, touristBEmail]) {
      await dataSource.getRepository(User).delete({ email });
    }
    await dataSource.getRepository(Route).delete({ slug });
    await rm(join('uploads', 'guides', guideId), {
      recursive: true,
      force: true,
    });
    await app.close();
  });

  it('lets the guide define weekly slots and rejects overlapping ones', async () => {
    const overlapping = await request(server)
      .put('/api/guides/me/schedule/slots')
      .set(auth(guideToken))
      .send({
        slots: [
          { weekday: 1, timeFrom: '05:00', timeTo: '08:00' },
          { weekday: 1, timeFrom: '07:00', timeTo: '09:00' },
        ],
      })
      .expect(400);
    expect(overlapping.body.error).toBe('OVERLAPPING_SLOTS');

    const schedule = await request(server)
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
    expect(schedule.body.slots).toHaveLength(7);
  });

  it('lists the guide for the route and hides them on blocked dates', async () => {
    const all = await request(server)
      .get(`/api/routes/${slug}/guides`)
      .expect(200);
    expect(all.body.map((guide: { id: string }) => guide.id)).toEqual([
      guideId,
    ]);

    const blockedDay = addDays(day, 20);
    await request(server)
      .post('/api/guides/me/schedule/blocked-dates')
      .set(auth(guideToken))
      .send({ dateFrom: blockedDay, dateTo: addDays(blockedDay, 1) })
      .expect(201);

    const free = await request(server)
      .get(`/api/routes/${slug}/guides`)
      .query({ date: day, startTime: '07:00' })
      .expect(200);
    expect(free.body).toHaveLength(1);

    const blocked = await request(server)
      .get(`/api/routes/${slug}/guides`)
      .query({ date: addDays(blockedDay, -1), startTime: '07:00' })
      .expect(200);
    expect(blocked.body).toHaveLength(0);

    const outsideSlot = await request(server)
      .get(`/api/routes/${slug}/guides`)
      .query({ date: day, startTime: '10:00' })
      .expect(200);
    expect(outsideSlot.body).toHaveLength(0);

    const booking = await requestBooking(touristAToken, {
      tourDate: blockedDay,
    }).expect(409);
    expect(booking.body.error).toBe('GUIDE_NOT_AVAILABLE');
  });

  it('validates people, start window, advance time and role', async () => {
    const tooMany = await requestBooking(touristAToken, {
      peopleCount: 5,
    }).expect(400);
    expect(tooMany.body.error).toBe('TOO_MANY_PEOPLE');

    const outside = await requestBooking(touristAToken, {
      startTime: '08:30',
    }).expect(400);
    expect(outside.body.error).toBe('START_TIME_OUTSIDE_WINDOW');

    const tooSoon = await requestBooking(touristAToken, {
      tourDate: todayInLaPaz(),
    }).expect(400);
    expect(tooSoon.body.error).toBe('INSUFFICIENT_ADVANCE');

    const asGuide = await requestBooking(guideToken).expect(403);
    expect(asGuide.body.error).toBe('INSUFFICIENT_ROLE');
  });

  it('creates a request with the route price and a response deadline', async () => {
    const before = Date.now();
    const response = await requestBooking(touristAToken).expect(201);
    bookingA = response.body.id;

    expect(response.body).toMatchObject({
      status: 'REQUESTED',
      type: 'PRIVATE',
      totalAmount: 150,
      tourDate: day,
      endDate: addDays(day, 1),
      startTime: '07:00',
    });
    expect(response.body.code).toMatch(/^PP-[A-Z0-9]{8}$/);
    const minutes =
      (new Date(response.body.respondBy).getTime() - before) / 60_000;
    expect(minutes).toBeGreaterThan(119);
    expect(minutes).toBeLessThan(121);

    const again = await requestBooking(touristAToken).expect(409);
    expect(again.body.error).toBe('BOOKING_ALREADY_REQUESTED');
  });

  it('lets a second tourist request overlapping dates while nothing is accepted', async () => {
    const response = await requestBooking(touristBToken, {
      tourDate: addDays(day, 1),
      startTime: '06:30',
    }).expect(201);
    bookingB = response.body.id;

    const hidden = await request(server)
      .get(`/api/bookings/${bookingA}`)
      .set(auth(touristBToken))
      .expect(404);
    expect(hidden.body.error).toBe('BOOKING_NOT_FOUND');
  });

  it('shows the guide the request without the tourist contact data', async () => {
    const response = await request(server)
      .get('/api/guides/me/bookings')
      .query({ status: 'REQUESTED' })
      .set(auth(guideToken))
      .expect(200);
    expect(response.body.meta.total).toBe(2);
    const first = response.body.data.find(
      (booking: { id: string }) => booking.id === bookingA,
    );
    expect(first.tourist).toMatchObject({
      firstName: 'Ana',
      country: 'CH',
      email: null,
      phone: null,
    });
  });

  it('accepts one request, opens the payment window and rejects the overlapping one', async () => {
    const before = Date.now();
    const accepted = await request(server)
      .post(`/api/guides/me/bookings/${bookingA}/accept`)
      .set(auth(guideToken))
      .expect(200);
    expect(accepted.body.status).toBe('ACCEPTED');
    const minutes = (new Date(accepted.body.payBy).getTime() - before) / 60_000;
    expect(minutes).toBeGreaterThan(29);
    expect(minutes).toBeLessThan(31);

    const displaced = await request(server)
      .get(`/api/bookings/${bookingB}`)
      .set(auth(touristBToken))
      .expect(200);
    expect(displaced.body.status).toBe('REJECTED');
    expect(displaced.body.cancellationReason).toContain('another booking');

    const again = await request(server)
      .post(`/api/guides/me/bookings/${bookingA}/accept`)
      .set(auth(guideToken))
      .expect(409);
    expect(again.body.error).toBe('INVALID_BOOKING_STATUS');

    const busy = await requestBooking(touristBToken).expect(409);
    expect(busy.body.error).toBe('GUIDE_NOT_AVAILABLE');

    const listing = await request(server)
      .get(`/api/routes/${slug}/guides`)
      .query({ date: addDays(day, 1), startTime: '07:00' })
      .expect(200);
    expect(listing.body).toHaveLength(0);
  });

  it('frees the guide again when the tourist cancels before paying', async () => {
    const cancelled = await request(server)
      .post(`/api/bookings/${bookingA}/cancel`)
      .set(auth(touristAToken))
      .send({ reason: 'Cambio de planes' })
      .expect(200);
    expect(cancelled.body.status).toBe('CANCELLED_BY_TOURIST');

    const listing = await request(server)
      .get(`/api/routes/${slug}/guides`)
      .query({ date: day, startTime: '07:00' })
      .expect(200);
    expect(listing.body).toHaveLength(1);

    const twice = await request(server)
      .post(`/api/bookings/${bookingA}/cancel`)
      .set(auth(touristAToken))
      .send({})
      .expect(409);
    expect(twice.body.error).toBe('INVALID_BOOKING_STATUS');
  });

  it('lets the guide reject a request with a reason', async () => {
    const created = await requestBooking(touristAToken, {
      tourDate: addDays(day, 3),
    }).expect(201);
    const rejected = await request(server)
      .post(`/api/guides/me/bookings/${created.body.id}/reject`)
      .set(auth(guideToken))
      .send({ reason: 'Ese día tengo otro compromiso.' })
      .expect(200);
    expect(rejected.body).toMatchObject({
      status: 'REJECTED',
      cancellationReason: 'Ese día tengo otro compromiso.',
    });
  });

  it('expires unanswered requests and unpaid acceptances', async () => {
    const unanswered = await requestBooking(touristBToken, {
      tourDate: addDays(day, 5),
    }).expect(201);
    const unpaid = await requestBooking(touristAToken, {
      tourDate: addDays(day, 8),
    }).expect(201);
    await request(server)
      .post(`/api/guides/me/bookings/${unpaid.body.id}/accept`)
      .set(auth(guideToken))
      .expect(200);

    const past = new Date(Date.now() - 60_000);
    await dataSource
      .getRepository(Booking)
      .update({ id: unanswered.body.id }, { respondBy: past });
    await dataSource
      .getRepository(Booking)
      .update({ id: unpaid.body.id }, { payBy: past });

    const expired = await app
      .get(BookingExpirationService)
      .expireOverdue(new Date());
    expect(expired).toBeGreaterThanOrEqual(2);

    for (const [id, token] of [
      [unanswered.body.id, touristBToken],
      [unpaid.body.id, touristAToken],
    ] as const) {
      const booking = await request(server)
        .get(`/api/bookings/${id}`)
        .set(auth(token))
        .expect(200);
      expect(booking.body.status).toBe('EXPIRED');
    }

    const late = await request(server)
      .post(`/api/guides/me/bookings/${unanswered.body.id}/accept`)
      .set(auth(guideToken))
      .expect(409);
    expect(late.body.error).toBe('INVALID_BOOKING_STATUS');
  });

  it('applies a new response window set by the admin', async () => {
    const settings = await request(server)
      .get('/api/admin/settings')
      .set(auth(adminToken))
      .expect(200);
    expect(
      settings.body.find(
        (setting: { key: string }) => setting.key === 'RESPONSE_WINDOW_MIN',
      ).value,
    ).toBe('120');

    await request(server)
      .patch('/api/admin/settings/RESPONSE_WINDOW_MIN')
      .set(auth(adminToken))
      .send({ value: 90 })
      .expect(200);

    const before = Date.now();
    const booking = await requestBooking(touristBToken, {
      tourDate: addDays(day, 14),
    }).expect(201);
    const minutes =
      (new Date(booking.body.respondBy).getTime() - before) / 60_000;
    expect(minutes).toBeGreaterThan(89);
    expect(minutes).toBeLessThan(91);

    const admin = await request(server)
      .get('/api/admin/bookings')
      .query({ status: 'EXPIRED', type: 'PRIVATE' })
      .set(auth(adminToken))
      .expect(200);
    expect(admin.body.meta.total).toBeGreaterThanOrEqual(2);
  });

  it('shows the public guide profile without clashing with the guide panel', async () => {
    const profile = await request(server)
      .get(`/api/guides/${guideId}`)
      .expect(200);
    expect(profile.body).toMatchObject({ id: guideId, firstName: 'Juan' });
    expect(
      profile.body.routes.map((route: { slug: string }) => route.slug),
    ).toEqual([slug]);
    expect(profile.body).not.toHaveProperty('nationalId');

    const panel = await request(server)
      .get('/api/guides/me')
      .set(auth(guideToken))
      .expect(200);
    expect(panel.body.id).toBe(guideId);
  });
});
