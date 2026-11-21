import { confirmTestEmail } from './helpers/confirm-email.js';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { DataSource, In } from 'typeorm';
import { AppModule } from './../src/app.module.js';
import { configureApp } from './../src/app.setup.js';
import { addDays } from './../src/common/time/la-paz-time.js';
import { todayInLaPaz } from './../src/common/verification/verification-documents.js';
import { Agency } from './../src/modules/agencies/entities/agency.entity.js';
import { Booking } from './../src/modules/bookings/entities/booking.entity.js';
import { GroupDeparture } from './../src/modules/group-departures/entities/group-departure.entity.js';
import { Payment } from './../src/modules/payments/entities/payment.entity.js';
import { Payout } from './../src/modules/payments/entities/payout.entity.js';
import { Refund } from './../src/modules/payments/entities/refund.entity.js';
import { BookingCompletionService } from './../src/modules/payments/services/booking-completion.service.js';
import { DepartureLifecycleService } from './../src/modules/payments/services/departure-lifecycle.service.js';
import { Review } from './../src/modules/reviews/entities/review.entity.js';
import { Route } from './../src/modules/routes/entities/route.entity.js';
import { CancellationReview } from './../src/modules/strikes/entities/cancellation-review.entity.js';
import { Strike } from './../src/modules/strikes/entities/strike.entity.js';
import { User } from './../src/modules/users/entities/user.entity.js';

const PDF = Buffer.from('%PDF-1.4\n%%EOF');

describe('Group departures (e2e)', () => {
  let app: INestApplication<App>;
  let server: App;
  let dataSource: DataSource;
  let adminToken: string;
  let agencyToken: string;
  let agencyId: string;
  let routeId: string;
  const tokens: Record<string, string> = {};
  const departureIds: string[] = [];

  const suffix = Date.now();
  const slug = `e2e-group-route-${suffix}`;
  const agencyEmail = `e2e.gagency.${suffix}@example.com`;
  const touristEmails = ['a', 'b', 'c'].map(
    (name) => `e2e.gtourist.${name}.${suffix}@example.com`,
  );
  const today = todayInLaPaz();

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  const publish = (overrides: Record<string, unknown> = {}) =>
    request(server)
      .post('/api/agencies/me/departures')
      .set(auth(agencyToken))
      .send({
        routeId,
        departureDate: addDays(today, 10),
        meetingTime: '07:00',
        meetingPoint: 'Plaza San Francisco',
        pricePerPerson: 100,
        maxPeople: 4,
        guideName: 'Juan Mamani',
        ...overrides,
      });

  const joinDeparture = (
    tourist: string,
    departureId: string,
    peopleCount: number,
  ) =>
    request(server)
      .post(`/api/departures/${departureId}/bookings`)
      .set(auth(tokens[tourist]))
      .send({ peopleCount });

  const pay = async (tourist: string, bookingId: string) => {
    const started = await request(server)
      .post(`/api/bookings/${bookingId}/payments`)
      .set(auth(tokens[tourist]))
      .send({ acceptTerms: true })
      .expect(201);
    await request(server)
      .post(`/api/bookings/${bookingId}/payments/${started.body.id}/capture`)
      .set(auth(tokens[tourist]))
      .expect(200);
  };

  const close = async (departureId: string) => {
    await dataSource
      .getRepository(GroupDeparture)
      .update({ id: departureId }, { closesAt: new Date(Date.now() - 60_000) });
    return app.get(DepartureLifecycleService).closeDue(new Date());
  };

  const bookingStatus = async (tourist: string, bookingId: string) =>
    (
      await request(server)
        .get(`/api/bookings/${bookingId}`)
        .set(auth(tokens[tourist]))
        .expect(200)
    ).body.status as string;

  const paymentStatus = async (tourist: string, bookingId: string) =>
    (
      await request(server)
        .get(`/api/bookings/${bookingId}/payments`)
        .set(auth(tokens[tourist]))
        .expect(200)
    ).body[0].status as string;

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
        nameEs: `Muela grupal ${suffix}`,
        nameEn: `Group tooth ${suffix}`,
        descriptionEs: 'Ruta de un día para probar salidas grupales.',
        descriptionEn: 'One day route to test group departures.',
        difficulty: 'EASY',
        autonomyLevel: 'SELF_GUIDED',
        days: 1,
        distanceKm: 7,
        elevationGainM: 450,
        elevationLossM: 450,
        maxAltitudeM: 3830,
        startTimeFrom: '06:00',
        startTimeTo: '08:00',
        howToGetThereEs: 'Transporte hasta Pedregal.',
        howToGetThereEn: 'Transport to Pedregal.',
        emergencyContacts: 'Policía 110',
        startLatitude: -16.55,
        startLongitude: -68.09,
        privatePrice: 250,
        groupMinPrice: 80,
        groupMaxPeople: 12,
      })
      .expect(201);
    routeId = route.body.id;
    for (const [order, minutes] of [
      [1, 0],
      [2, 240],
    ]) {
      await request(server)
        .post(`/api/admin/routes/${routeId}/points`)
        .set(auth(adminToken))
        .send({
          type: order === 1 ? 'START' : 'END',
          nameEs: `Punto ${order}`,
          nameEn: `Point ${order}`,
          latitude: -16.55,
          longitude: -68.09,
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

    const agency = await request(server)
      .post('/api/auth/register/agency')
      .send({
        email: agencyEmail,
        password: 'Agencia2026',
        firstName: 'Lucía',
        lastName: 'Quispe',
        legalName: `Andes Grupos ${suffix} S.R.L.`,
        taxId: String(suffix).slice(-11),
        operatorLicense: 'RNT-LP-0001',
        association: 'ASOGUIA La Paz',
        address: 'Calle Sagárnaga 213, La Paz',
      })
      .expect(201);
    agencyToken = agency.body.accessToken;
    for (const type of [
      'TAX_ID',
      'OPERATOR_LICENSE',
      'ASSOCIATION_CERTIFICATE',
      'REPRESENTATIVE_ID',
    ]) {
      await request(server)
        .post('/api/agencies/me/documents')
        .set(auth(agencyToken))
        .field('type', type)
        .attach('file', PDF, 'document.pdf')
        .expect(201);
    }
    const me = await request(server)
      .get('/api/agencies/me')
      .set(auth(agencyToken))
      .expect(200);
    agencyId = me.body.id;
    await request(server)
      .patch(`/api/admin/agencies/${agencyId}/verification`)
      .set(auth(adminToken))
      .send({ status: 'APPROVED' })
      .expect(200);

    for (const [index, name] of ['a', 'b', 'c'].entries()) {
      const registered = await request(server)
        .post('/api/auth/register')
        .send({
          email: touristEmails[index],
          password: 'Trekking2026',
          firstName: `Turista ${name.toUpperCase()}`,
          lastName: 'Demo',
          phone: '+591 70000000',
        })
        .expect(201);
      await confirmTestEmail(server, registered.body);
      tokens[name] = registered.body.accessToken;
    }
  });

  afterAll(async () => {
    if (departureIds.length > 0) {
      const bookings = await dataSource
        .getRepository(Booking)
        .findBy({ groupDepartureId: In(departureIds) });
      const bookingIds = bookings.map((booking) => booking.id);
      if (bookingIds.length > 0) {
        const payments = await dataSource
          .getRepository(Payment)
          .findBy({ bookingId: In(bookingIds) });
        if (payments.length > 0) {
          await dataSource
            .getRepository(Refund)
            .delete({ paymentId: In(payments.map((payment) => payment.id)) });
        }
        await dataSource
          .getRepository(Review)
          .delete({ bookingId: In(bookingIds) });
        await dataSource
          .getRepository(Payment)
          .delete({ bookingId: In(bookingIds) });
        await dataSource
          .getRepository(Payout)
          .delete({ bookingId: In(bookingIds) });
        await dataSource.getRepository(Booking).delete({ id: In(bookingIds) });
      }
      for (const entity of [Strike, CancellationReview]) {
        await dataSource
          .getRepository(entity)
          .delete({ groupDepartureId: In(departureIds) });
      }
      await dataSource
        .getRepository(GroupDeparture)
        .delete({ id: In(departureIds) });
    }
    await dataSource.getRepository(Agency).delete({ id: agencyId });
    for (const email of [agencyEmail, ...touristEmails]) {
      await dataSource.getRepository(User).delete({ email });
    }
    await dataSource.getRepository(Route).delete({ slug });
    await rm(join('uploads', 'cancellations', 'agencies', agencyId), {
      recursive: true,
      force: true,
    });
    await rm(join('uploads', 'agencies', agencyId), {
      recursive: true,
      force: true,
    });
    await app.close();
  });

  it('validates price, group size and closing time before publishing', async () => {
    const cheap = await publish({ pricePerPerson: 50 }).expect(400);
    expect(cheap.body.error).toBe('PRICE_BELOW_MINIMUM');

    const small = await publish({ minPeople: 2 }).expect(400);
    expect(small.body.error).toBe('INVALID_GROUP_SIZE');

    const soon = await publish({ departureDate: addDays(today, 1) }).expect(
      400,
    );
    expect(soon.body.error).toBe('DEPARTURE_TOO_SOON');

    const tourist = await request(server)
      .post('/api/agencies/me/departures')
      .set(auth(tokens.a))
      .send({})
      .expect(403);
    expect(tourist.body.error).toBe('INSUFFICIENT_ROLE');
  });

  it('blocks new departures while an agency document is expired', async () => {
    await dataSource.query(
      `UPDATE agency_documents SET expires_at = $1 WHERE agency_id = $2 AND type = 'TAX_ID'`,
      [addDays(today, -1), agencyId],
    );
    try {
      const blocked = await publish().expect(403);
      expect(blocked.body.error).toBe('AGENCY_DOCUMENTS_EXPIRED');
      await request(server)
        .get('/api/agencies/me/departures')
        .set(auth(agencyToken))
        .expect(200);
    } finally {
      await dataSource.query(
        `UPDATE agency_documents SET expires_at = $1 WHERE agency_id = $2 AND type = 'TAX_ID'`,
        [addDays(today, 365), agencyId],
      );
    }
  });

  it('publishes a departure that closes 48 hours before the start', async () => {
    const created = await publish().expect(201);
    departureIds.push(created.body.id);
    expect(created.body).toMatchObject({
      status: 'PUBLISHED',
      minPeople: 3,
      maxPeople: 4,
      seatsTaken: 0,
      seatsLeft: 4,
      meetingTime: '07:00',
    });
    const start = new Date(`${addDays(today, 10)}T07:00:00-04:00`).getTime();
    expect(new Date(created.body.closesAt).getTime()).toBe(
      start - 48 * 3_600_000,
    );

    const list = await request(server)
      .get('/api/departures')
      .query({ routeSlug: slug })
      .expect(200);
    expect(list.body.data.map((item: { id: string }) => item.id)).toEqual([
      created.body.id,
    ]);
  });

  it('lets tourists join, pay and keeps the seat count', async () => {
    const departureId = departureIds[0];
    const joined = await joinDeparture('a', departureId, 2).expect(201);
    expect(joined.body).toMatchObject({
      type: 'GROUP',
      status: 'ACCEPTED',
      totalAmount: 200,
      guide: null,
      groupDepartureId: departureId,
      startTime: '07:00',
    });
    expect(joined.body.agency.legalName).toContain('Andes Grupos');

    const twice = await joinDeparture('a', departureId, 1).expect(409);
    expect(twice.body.error).toBe('ALREADY_JOINED');

    const full = await joinDeparture('b', departureId, 3).expect(409);
    expect(full.body.error).toBe('NOT_ENOUGH_SEATS');

    await pay('a', joined.body.id);
    expect(await bookingStatus('a', joined.body.id)).toBe('CONFIRMED');

    const manual = await request(server)
      .post(`/api/agencies/me/departures/${departureId}/manual-bookings`)
      .set(auth(agencyToken))
      .send({ peopleCount: 1, contact: 'Carlos Pérez, +591 71111111' })
      .expect(201);
    expect(manual.body.seatsLeft).toBe(1);
    expect(manual.body.participants).toMatchObject([
      { source: 'WEB', peopleCount: 2, name: 'Turista A Demo' },
      {
        source: 'MANUAL',
        peopleCount: 1,
        contact: 'Carlos Pérez, +591 71111111',
      },
    ]);
    expect(manual.body.participants[0].contact).toContain(touristEmails[0]);
  });

  it('confirms the departure at closing when the minimum is reached', async () => {
    const summary = await close(departureIds[0]);
    expect(summary.confirmed).toBeGreaterThanOrEqual(1);

    const departure = await request(server)
      .get(`/api/departures/${departureIds[0]}`)
      .expect(200);
    expect(departure.body.status).toBe('CONFIRMED');

    const late = await joinDeparture('b', departureIds[0], 1).expect(409);
    expect(late.body.error).toBe('DEPARTURE_CLOSED');
  });

  it('cancels and refunds everyone when the minimum is not reached', async () => {
    const created = await publish({
      departureDate: addDays(today, 12),
      maxPeople: 10,
    }).expect(201);
    departureIds.push(created.body.id);

    const paid = await joinDeparture('b', created.body.id, 1).expect(201);
    await pay('b', paid.body.id);
    const unpaid = await joinDeparture('c', created.body.id, 1).expect(201);

    const summary = await close(created.body.id);
    expect(summary.cancelled).toBeGreaterThanOrEqual(1);

    expect(await bookingStatus('b', paid.body.id)).toBe(
      'CANCELLED_BY_PROVIDER',
    );
    expect(await paymentStatus('b', paid.body.id)).toBe('REFUNDED');
    expect(await bookingStatus('c', unpaid.body.id)).toBe('EXPIRED');

    const departure = await request(server)
      .get(`/api/departures/${created.body.id}`)
      .expect(200);
    expect(departure.body.status).toBe('CANCELLED_MIN_NOT_REACHED');
  });

  it('pays the agency after a completed departure', async () => {
    const created = await publish({
      departureDate: addDays(today, 14),
      maxPeople: 5,
    }).expect(201);
    departureIds.push(created.body.id);
    const joined = await joinDeparture('c', created.body.id, 3).expect(201);
    await pay('c', joined.body.id);
    await close(created.body.id);

    await dataSource
      .getRepository(Booking)
      .update(
        { id: joined.body.id },
        { endsAt: new Date(Date.now() - 60_000) },
      );
    await app.get(BookingCompletionService).completeFinished(new Date());

    const payouts = await request(server)
      .get('/api/agencies/me/payouts')
      .set(auth(agencyToken))
      .expect(200);
    expect(payouts.body.data).toMatchObject([
      {
        bookingId: joined.body.id,
        grossAmount: 300,
        commissionAmount: 45,
        netAmount: 255,
        routeNameEs: `Muela grupal ${suffix}`,
        tourDate: addDays(today, 14),
      },
    ]);
  });

  it('refunds paid tourists when the agency cancels for weather', async () => {
    const departureId = departureIds[0];
    const cancelled = await request(server)
      .post(`/api/agencies/me/departures/${departureId}/cancel`)
      .set(auth(agencyToken))
      .send({ reason: 'Nevada fuerte en la zona', weather: true })
      .expect(200);

    expect(cancelled.body.status).toBe('CANCELLED_WEATHER');
    expect(
      cancelled.body.participants.map(
        (item: { status: string }) => item.status,
      ),
    ).toEqual(['CANCELLED_WEATHER', 'CANCELLED_WEATHER']);

    const tourist = await request(server)
      .get('/api/bookings/me')
      .set(auth(tokens.a))
      .expect(200);
    const booking = tourist.body.data[0];
    expect(await paymentStatus('a', booking.id)).toBe('REFUNDED');

    const again = await request(server)
      .post(`/api/agencies/me/departures/${departureId}/cancel`)
      .set(auth(agencyToken))
      .send({ reason: 'Otra vez' })
      .expect(409);
    expect(again.body.error).toBe('INVALID_BOOKING_STATUS');
  });

  it('opens a review for the agency cancellation and fines the agency', async () => {
    const departureId = departureIds[0];
    const pending = await request(server)
      .get('/api/admin/cancellation-reviews')
      .query({ status: 'PENDING', limit: 100 })
      .set(auth(adminToken))
      .expect(200);
    const review = pending.body.data.find(
      (item: { groupDepartureId: string }) =>
        item.groupDepartureId === departureId,
    );
    expect(review).toMatchObject({
      providerKind: 'AGENCY',
      agencyId,
      bookingId: null,
      cancellationReason: 'Nevada fuerte en la zona',
      hasEvidence: false,
    });
    expect(review.fineBaseAmount).toBeGreaterThan(0);

    const resolved = await request(server)
      .post(`/api/admin/cancellation-reviews/${review.id}/resolve`)
      .set(auth(adminToken))
      .send({
        decision: 'STRIKE_AND_FINE',
        finePercent: 10,
        resolution: 'El pronóstico no justificaba suspender la salida.',
      })
      .expect(200);
    expect(resolved.body).toMatchObject({
      activeStrikes: 1,
      sanction: 'NONE',
      strike: {
        providerKind: 'AGENCY',
        agencyId,
        groupDepartureId: departureId,
      },
    });
    expect(resolved.body.review.fineAmount).toBeCloseTo(
      review.fineBaseAmount * 0.1,
      2,
    );

    const sanctions = await request(server)
      .get('/api/agencies/me/sanctions')
      .set(auth(agencyToken))
      .expect(200);
    expect(sanctions.body).toMatchObject({
      activeStrikes: 1,
      hiddenUntil: null,
      pendingFines: resolved.body.review.fineAmount,
    });
  });

  it('hides the agency at the second strike and suspends it at the third', async () => {
    const created: string[] = [];
    for (const daysAhead of [20, 22, 24]) {
      const departure = await publish({
        departureDate: addDays(today, daysAhead),
      }).expect(201);
      departureIds.push(departure.body.id);
      created.push(departure.body.id);
    }
    const [second, stillOpen, third] = created;

    const cancelled = await request(server)
      .post(`/api/agencies/me/departures/${second}/cancel`)
      .set(auth(agencyToken))
      .field('reason', 'Nuestro guía se enfermó y no conseguimos reemplazo')
      .attach('evidence', PDF, 'certificado.pdf')
      .expect(200);
    expect(cancelled.body.status).toBe('CANCELLED_BY_AGENCY');

    const reviews = await request(server)
      .get('/api/admin/cancellation-reviews')
      .query({ status: 'PENDING', limit: 100 })
      .set(auth(adminToken))
      .expect(200);
    const secondReview = reviews.body.data.find(
      (item: { groupDepartureId: string }) => item.groupDepartureId === second,
    );
    expect(secondReview.hasEvidence).toBe(true);

    const hidden = await request(server)
      .post(`/api/admin/cancellation-reviews/${secondReview.id}/resolve`)
      .set(auth(adminToken))
      .send({
        decision: 'STRIKE',
        resolution: 'La agencia debía reponer al guía.',
      })
      .expect(200);
    expect(hidden.body).toMatchObject({ activeStrikes: 2, sanction: 'HIDDEN' });

    const open = await request(server)
      .get('/api/departures')
      .query({ routeSlug: slug, limit: 100 })
      .expect(200);
    expect(
      open.body.data.some((item: { id: string }) => item.id === stillOpen),
    ).toBe(false);
    await request(server).get(`/api/departures/${stillOpen}`).expect(404);
    await joinDeparture('b', stillOpen, 1).expect(404);

    await request(server)
      .post(`/api/agencies/me/departures/${third}/cancel`)
      .set(auth(agencyToken))
      .send({ reason: 'Decidimos no operar esa fecha' })
      .expect(200);
    const thirdReviews = await request(server)
      .get('/api/admin/cancellation-reviews')
      .query({ status: 'PENDING', limit: 100 })
      .set(auth(adminToken))
      .expect(200);
    const thirdReview = thirdReviews.body.data.find(
      (item: { groupDepartureId: string }) => item.groupDepartureId === third,
    );
    const suspended = await request(server)
      .post(`/api/admin/cancellation-reviews/${thirdReview.id}/resolve`)
      .set(auth(adminToken))
      .send({
        decision: 'STRIKE',
        resolution: 'Tercera cancelación sin causa.',
      })
      .expect(200);
    expect(suspended.body).toMatchObject({
      activeStrikes: 3,
      sanction: 'SUSPENDED',
    });

    const login = await request(server)
      .post('/api/auth/login')
      .send({ email: agencyEmail, password: 'Agencia2026' })
      .expect(403);
    expect(login.body.error).toBe('USER_SUSPENDED');

    const cancelledByJob = await app
      .get(DepartureLifecycleService)
      .cancelForSuspendedAgencies(new Date());
    expect(cancelledByJob).toBeGreaterThanOrEqual(1);
    const departure = await dataSource
      .getRepository(GroupDeparture)
      .findOneByOrFail({ id: stillOpen });
    expect(departure.status).toBe('CANCELLED_BY_AGENCY');

    const strikes = await request(server)
      .get('/api/admin/strikes')
      .query({ agencyId })
      .set(auth(adminToken))
      .expect(200);
    expect(strikes.body.meta.total).toBe(3);
  });
  it('lets the tourist review the agency after a completed departure', async () => {
    const mine = await request(server)
      .get('/api/bookings/me')
      .query({ status: 'COMPLETED' })
      .set(auth(tokens.c))
      .expect(200);
    const completed = mine.body.data[0];
    expect(completed).toBeDefined();

    await request(server)
      .post(`/api/bookings/${completed.id}/review`)
      .set(auth(tokens.c))
      .send({ rating: 4, comment: 'Buena organización y puntuales.' })
      .expect(201);

    const reviews = await request(server)
      .get(`/api/agencies/${agencyId}/reviews`)
      .expect(200);
    expect(reviews.body.meta.total).toBe(1);
    const agency = await dataSource
      .getRepository(Agency)
      .findOneByOrFail({ id: agencyId });
    expect(agency).toMatchObject({ ratingAverage: 4, reviewsCount: 1 });
  });
});
