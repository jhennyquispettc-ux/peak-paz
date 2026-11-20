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
import { Reschedule } from './../src/modules/bookings/entities/reschedule.entity.js';
import { ReschedulesService } from './../src/modules/bookings/services/reschedules.service.js';
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

describe('Date changes proposed by the guide (e2e)', () => {
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
  const slug = `e2e-reschedule-route-${suffix}`;
  const guideEmail = `e2e.rguide.${suffix}@example.com`;
  const touristEmail = `e2e.rtourist.${suffix}@example.com`;
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
        nameEs: `Chacaltaya fechas ${suffix}`,
        nameEn: `Chacaltaya dates ${suffix}`,
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
        nationalId: '9123456',
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

    booking.accepted = await paidBooking(8);
    booking.busy = await paidBooking(12);
    booking.rejected = await paidBooking(16);
    booking.late = await paidBooking(20);
    booking.expired = await paidBooking(24);
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

  const propose = (bookingId: string, newDate: string) =>
    request(server)
      .post(`/api/guides/me/bookings/${bookingId}/reschedules`)
      .set(auth(guideToken))
      .send({ newDate, reason: 'Pronóstico de nevada fuerte en la cumbre' });

  it('lets the guide propose a new date once at a time', async () => {
    const proposed = await propose(booking.accepted, addDays(today, 10)).expect(
      201,
    );
    expect(proposed.body).toMatchObject({
      bookingId: booking.accepted,
      previousDate: addDays(today, 8),
      newDate: addDays(today, 10),
      response: 'PENDING',
    });
    const respondBy = new Date(proposed.body.respondBy).getTime();
    const originalStart = new Date(
      `${addDays(today, 8)}T07:00:00-04:00`,
    ).getTime();
    expect(respondBy).toBe(originalStart - 24 * HOUR);

    const twice = await propose(booking.accepted, addDays(today, 11)).expect(
      409,
    );
    expect(twice.body.error).toBe('RESCHEDULE_ALREADY_PENDING');

    const same = await propose(booking.busy, addDays(today, 12)).expect(400);
    expect(same.body.error).toBe('SAME_DATE');

    const seen = await request(server)
      .get(`/api/bookings/${booking.accepted}/reschedules`)
      .set(auth(touristToken))
      .expect(200);
    expect(seen.body).toHaveLength(1);
  });

  it('moves the booking when the tourist accepts', async () => {
    const [pending] = (
      await request(server)
        .get(`/api/bookings/${booking.accepted}/reschedules`)
        .set(auth(touristToken))
        .expect(200)
    ).body;
    const accepted = await request(server)
      .post(
        `/api/bookings/${booking.accepted}/reschedules/${pending.id}/accept`,
      )
      .set(auth(touristToken))
      .expect(200);
    expect(accepted.body).toMatchObject({
      tourDate: addDays(today, 10),
      reconfirmedAt: null,
      status: 'CONFIRMED',
    });

    const again = await request(server)
      .post(
        `/api/bookings/${booking.accepted}/reschedules/${pending.id}/accept`,
      )
      .set(auth(touristToken))
      .expect(409);
    expect(again.body.error).toBe('RESCHEDULE_CLOSED');
  });

  it('does not propose a date when the guide is already busy', async () => {
    const busy = await propose(booking.busy, addDays(today, 10)).expect(409);
    expect(busy.body.error).toBe('GUIDE_NOT_AVAILABLE');
  });

  it('refunds the tourist and opens a review when the new date is rejected', async () => {
    const proposed = await propose(booking.rejected, addDays(today, 18)).expect(
      201,
    );
    const rejected = await request(server)
      .post(
        `/api/bookings/${booking.rejected}/reschedules/${proposed.body.id}/reject`,
      )
      .set(auth(touristToken))
      .expect(200);
    expect(rejected.body.booking.status).toBe('CANCELLED_BY_PROVIDER');
    expect(rejected.body.refund).toMatchObject({
      reason: 'RESCHEDULE_REJECTED',
      status: 'COMPLETED',
    });
    expect(rejected.body.reviewId).toEqual(expect.any(String));

    const review = await request(server)
      .get(`/api/admin/cancellation-reviews/${rejected.body.reviewId}`)
      .set(auth(adminToken))
      .expect(200);
    expect(review.body).toMatchObject({
      providerKind: 'GUIDE',
      bookingId: booking.rejected,
      status: 'PENDING',
    });
    expect(review.body.cancellationReason).toContain(
      'rechazó el cambio de fecha',
    );
  });

  it('does not accept a proposal when the tourist has no time left to answer', async () => {
    const startsAt = new Date(Date.now() + 20 * HOUR);
    await moveTo(
      booking.late,
      startsAt,
      new Date(startsAt.getTime() + 5 * HOUR),
    );
    const late = await propose(booking.late, addDays(today, 22)).expect(409);
    expect(late.body.error).toBe('RESCHEDULE_TOO_LATE');
  });

  it('expires an unanswered proposal and keeps the original date', async () => {
    const proposed = await propose(booking.expired, addDays(today, 26)).expect(
      201,
    );
    await dataSource
      .getRepository(Reschedule)
      .update(
        { id: proposed.body.id },
        { respondBy: new Date(Date.now() - MINUTE) },
      );
    const expired = await app.get(ReschedulesService).expireDue(new Date());
    expect(expired).toBeGreaterThanOrEqual(1);

    const answer = await request(server)
      .post(
        `/api/bookings/${booking.expired}/reschedules/${proposed.body.id}/accept`,
      )
      .set(auth(touristToken))
      .expect(409);
    expect(answer.body.error).toBe('RESCHEDULE_CLOSED');

    const current = await request(server)
      .get(`/api/bookings/${booking.expired}`)
      .set(auth(touristToken))
      .expect(200);
    expect(current.body.tourDate).toBe(addDays(today, 24));
    const list = await request(server)
      .get(`/api/guides/me/bookings/${booking.expired}/reschedules`)
      .set(auth(guideToken))
      .expect(200);
    expect(list.body[0].response).toBe('EXPIRED');
  });
});
