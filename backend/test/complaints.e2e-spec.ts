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
import { BookingCompletionService } from './../src/modules/payments/services/booking-completion.service.js';
import { Route } from './../src/modules/routes/entities/route.entity.js';
import { CancellationReview } from './../src/modules/strikes/entities/cancellation-review.entity.js';
import { Complaint } from './../src/modules/strikes/entities/complaint.entity.js';
import { Strike } from './../src/modules/strikes/entities/strike.entity.js';
import { User } from './../src/modules/users/entities/user.entity.js';

const PDF = Buffer.from('%PDF-1.4\n%%EOF');
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

describe('Complaints after the tour (e2e)', () => {
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
  const slug = `e2e-complaint-route-${suffix}`;
  const guideEmail = `e2e.qguide.${suffix}@example.com`;
  const touristEmail = `e2e.qtourist.${suffix}@example.com`;
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
        nameEs: `Chacaltaya reclamos ${suffix}`,
        nameEn: `Chacaltaya complaints ${suffix}`,
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
        nationalId: '4123456',
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
    booking.rejected = await paidBooking(10);
    booking.late = await paidBooking(12);
  });

  afterAll(async () => {
    if (bookingIds.length > 0) {
      for (const entity of [Complaint, Dispute, Strike, CancellationReview]) {
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

  const finishTour = async (bookingId: string, endedAgo: number) => {
    await dataSource.getRepository(Booking).update(
      { id: bookingId },
      {
        tourDate: addDays(today, -5),
        status: BookingStatus.IN_PROGRESS,
        endsAt: new Date(Date.now() - endedAgo),
        guideStartedAt: new Date(Date.now() - endedAgo - 5 * HOUR),
        guideStartLatitude: -16.35,
        guideStartLongitude: -67.92,
        guideStartDistanceM: 0,
        touristStartedAt: new Date(Date.now() - endedAgo - 5 * HOUR),
      },
    );
    await app.get(BookingCompletionService).completeFinished(new Date());
  };

  const complain = (bookingId: string, description: string) =>
    request(server)
      .post(`/api/bookings/${bookingId}/complaints`)
      .set(auth(touristToken))
      .send({ description });

  const payoutOf = async (bookingId: string) => {
    const payouts = await request(server)
      .get('/api/admin/payouts')
      .query({ limit: 100 })
      .set(auth(adminToken))
      .expect(200);
    return payouts.body.data.find(
      (item: { bookingId: string }) => item.bookingId === bookingId,
    );
  };

  const resolve = (complaintId: string, body: Record<string, unknown>) =>
    request(server)
      .post(`/api/admin/complaints/${complaintId}/resolve`)
      .set(auth(adminToken))
      .send({ resolution: 'Revisado con las dos partes.', ...body });

  it('opens one complaint for a completed tour and holds the payout', async () => {
    const early = await complain(
      booking.accepted,
      'El guía nos dejó solos en el descenso.',
    ).expect(409);
    expect(early.body.error).toBe('INVALID_BOOKING_STATUS');

    await finishTour(booking.accepted, 25 * HOUR);
    await complain(booking.accepted, 'Muy corto').expect(400);
    const opened = await complain(
      booking.accepted,
      'El guía nos dejó solos en el descenso y llegamos de noche.',
    ).expect(201);
    expect(opened.body).toMatchObject({
      status: 'OPEN',
      providerKind: 'GUIDE',
      guideProfileId: guideId,
      touristName: 'Tom Becker',
    });

    const twice = await complain(
      booking.accepted,
      'Quiero agregar otro reclamo sobre el mismo tour.',
    ).expect(409);
    expect(twice.body.error).toBe('COMPLAINT_ALREADY_EXISTS');

    const payout = await payoutOf(booking.accepted);
    const held = await request(server)
      .patch(`/api/admin/payouts/${payout.id}/paid`)
      .set(auth(adminToken))
      .expect(409);
    expect(held.body.error).toBe('PAYOUT_ON_HOLD');
  });

  it('validates the resolution options', async () => {
    const { body } = await request(server)
      .get(`/api/bookings/${booking.accepted}/complaints`)
      .set(auth(touristToken))
      .expect(200);
    const missing = await resolve(body.id, { decision: 'ACCEPTED' }).expect(
      400,
    );
    expect(missing.body.error).toBe('REFUND_PERCENT_REQUIRED');
    const rejected = await resolve(body.id, {
      decision: 'REJECTED',
      strike: true,
    }).expect(400);
    expect(rejected.body.error).toBe('COMPLAINT_OPTIONS_NOT_ALLOWED');
  });

  it('refunds part of the payment, takes it from the payout and gives a strike', async () => {
    const { body } = await request(server)
      .get(`/api/bookings/${booking.accepted}/complaints`)
      .set(auth(touristToken))
      .expect(200);
    const resolved = await resolve(body.id, {
      decision: 'ACCEPTED',
      refundPercent: 50,
      strike: true,
    }).expect(200);
    expect(resolved.body).toMatchObject({
      complaint: {
        status: 'ACCEPTED',
        refundPercent: 50,
        deductionAmount: 75,
        deductionSettled: 75,
      },
      refund: { reason: 'COMPLAINT', status: 'COMPLETED' },
      strike: { reason: 'COMPLAINT', guideProfileId: guideId },
      activeStrikes: 1,
      sanction: 'NONE',
    });

    const twice = await resolve(body.id, { decision: 'REJECTED' }).expect(409);
    expect(twice.body.error).toBe('COMPLAINT_RESOLVED');

    const payout = await payoutOf(booking.accepted);
    expect(payout).toMatchObject({ penaltyDeduction: 75, netAmount: 52.5 });
    await request(server)
      .patch(`/api/admin/payouts/${payout.id}/paid`)
      .set(auth(adminToken))
      .expect(200);
  });

  it('keeps the payout when the complaint is rejected', async () => {
    await finishTour(booking.rejected, 30 * HOUR);
    const opened = await complain(
      booking.rejected,
      'La comida que ofrecieron no era la que esperábamos.',
    ).expect(201);
    const resolved = await resolve(opened.body.id, {
      decision: 'REJECTED',
    }).expect(200);
    expect(resolved.body).toMatchObject({
      complaint: { status: 'REJECTED', deductionAmount: 0 },
      refund: null,
      strike: null,
    });
    expect(await payoutOf(booking.rejected)).toMatchObject({
      penaltyDeduction: 0,
      netAmount: 127.5,
    });
  });

  it('closes the complaint window 72 hours after the tour', async () => {
    await finishTour(booking.late, 73 * HOUR);
    const late = await complain(
      booking.late,
      'Recién ahora puedo escribir sobre el tour que hicimos.',
    ).expect(409);
    expect(late.body.error).toBe('COMPLAINT_WINDOW_CLOSED');
  });
});
