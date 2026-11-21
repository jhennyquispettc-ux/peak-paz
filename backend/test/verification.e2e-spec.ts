import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { VerificationClient } from '../src/modules/verification/verification.client.js';
import { confirmationToken } from './helpers/confirm-email.js';

describe('Account verification through the real microservice', () => {
  let app: INestApplication<App>;
  let server: App;
  let tourist: { accessToken: string; user: { id: string; email: string } };
  let guide: typeof tourist;
  let guideId: string;
  let adminToken: string;
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
  const suffix = randomUUID();
  const PDF = Buffer.from('%PDF-1.4\n1 0 obj << >> endobj\n%%EOF');

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    configureApp(app, 'api');
    await app.init();
    server = app.getHttpServer();
    const login = await request(server)
      .post('/api/auth/login')
      .send({
        email: process.env.SEED_ADMIN_EMAIL,
        password: process.env.SEED_ADMIN_PASSWORD,
      })
      .expect(200);
    adminToken = login.body.accessToken;
  });
  afterAll(async () => {
    await app?.close();
  });

  it('rejects blank names and attempts to self-verify during registration', async () => {
    const data = {
      firstName: '   ',
      lastName: 'Mamani',
      email: `blank.${suffix}@example.com`,
      password: 'Sendero2026',
    };
    await request(server).post('/api/auth/register').send(data).expect(400);
    await request(server)
      .post('/api/auth/register')
      .send({
        ...data,
        firstName: 'Ana',
        emailVerifiedAt: new Date().toISOString(),
      })
      .expect(400);
  });
  it('creates a pending tourist account and limits access without losing the session', async () => {
    tourist = (
      await request(server)
        .post('/api/auth/register')
        .send({
          firstName: 'Ana',
          lastName: 'Mamani',
          email: `new.${suffix}@example.com`,
          password: 'Sendero2026',
        })
        .expect(201)
    ).body;
    await request(server)
      .get('/api/users/me')
      .set(auth(tourist.accessToken))
      .expect(200)
      .expect((response) => expect(response.body.emailVerifiedAt).toBeNull());
    const blocked = await request(server)
      .post('/api/bookings')
      .set(auth(tourist.accessToken))
      .send({})
      .expect(403);
    expect(blocked.body.error).toBe('EMAIL_NOT_VERIFIED');
    await request(server)
      .post(`/api/departures/${randomUUID()}/bookings`)
      .set(auth(tourist.accessToken))
      .send({ peopleCount: 1 })
      .expect(403);
  });
  it('creates the remote case idempotently and throttles repeated resend requests', async () => {
    const first = await request(server)
      .get('/api/verification/me')
      .set(auth(tourist.accessToken))
      .expect(200);
    const second = await request(server)
      .get('/api/verification/me')
      .set(auth(tourist.accessToken))
      .expect(200);
    expect(second.body.tokenExpiresAt).toBe(first.body.tokenExpiresAt);
    await request(server)
      .post('/api/verification/email/resend')
      .set(auth(tourist.accessToken))
      .expect(429);
  });
  it('confirms the email without login, rejects replay and allows business requests with the original session', async () => {
    const token = await confirmationToken(tourist.user.email);
    await request(server)
      .post('/api/verification/email/confirm')
      .send({ token })
      .expect(200);
    await request(server)
      .post('/api/verification/email/confirm')
      .send({ token })
      .expect(400);
    await request(server)
      .get('/api/users/me')
      .set(auth(tourist.accessToken))
      .expect(200)
      .expect((response) => expect(response.body.emailVerifiedAt).toBeTruthy());
    // Validation now runs instead of the unverified-email guard.
    await request(server)
      .post('/api/bookings')
      .set(auth(tourist.accessToken))
      .send({})
      .expect(400);
  });
  it('does not expose another account or permit a user to approve themselves', async () => {
    await request(server)
      .get(`/api/verification/admin/users/${tourist.user.id}`)
      .set(auth(tourist.accessToken))
      .expect(403);
    await request(server)
      .patch('/api/users/me')
      .set(auth(tourist.accessToken))
      .send({ emailVerifiedAt: new Date().toISOString() })
      .expect(400);
    await request(server)
      .get('/api/verification/admin/delivery-failures')
      .set(auth(tourist.accessToken))
      .expect(403);
  });
  it('registers a guide who can upload documents before confirming email', async () => {
    guide = (
      await request(server)
        .post('/api/auth/register/guide')
        .send({
          firstName: 'Juan',
          lastName: 'Mamani',
          email: `guide.${suffix}@example.com`,
          password: 'Sendero2026',
          nationalId: '7654321',
          languages: ['es'],
          yearsExperience: 4,
        })
        .expect(201)
    ).body;
    const profile = await request(server)
      .get('/api/guides/me')
      .set(auth(guide.accessToken))
      .expect(200);
    guideId = profile.body.id;
    for (const type of ['NATIONAL_ID', 'GUIDE_CREDENTIAL', 'FIRST_AID']) {
      await request(server)
        .post('/api/guides/me/documents')
        .set(auth(guide.accessToken))
        .field('type', type)
        .field('expiresAt', '2030-12-31')
        .attach('file', PDF, 'credential.pdf')
        .expect(201);
    }
    await request(server)
      .patch(`/api/admin/guides/${guideId}/verification`)
      .set(auth(adminToken))
      .send({ status: 'APPROVED' })
      .expect(400)
      .expect((response) =>
        expect(response.body.error).toBe('EMAIL_NOT_VERIFIED'),
      );
  });
  it('still requires document approval after confirming the guide email', async () => {
    await request(server)
      .get('/api/verification/me')
      .set(auth(guide.accessToken))
      .expect(200);
    const token = await confirmationToken(guide.user.email);
    await request(server)
      .post('/api/verification/email/confirm')
      .send({ token })
      .expect(200);
    await request(server)
      .get('/api/guides/me/bookings')
      .set(auth(guide.accessToken))
      .expect(403)
      .expect((response) =>
        expect(response.body.error).toBe('PROVIDER_NOT_APPROVED'),
      );
    await request(server)
      .post('/api/guides/me/verification-request')
      .set(auth(guide.accessToken))
      .expect(200);
  });
  it('stores a rejection, supports resubmission and records who approved the guide', async () => {
    await request(server)
      .patch(`/api/admin/guides/${guideId}/verification`)
      .set(auth(adminToken))
      .send({
        status: 'REJECTED',
        rejectionReason: 'Revisar la legibilidad de los documentos.',
      })
      .expect(200);
    await request(server)
      .post('/api/guides/me/verification-request')
      .set(auth(guide.accessToken))
      .expect(200);
    await request(server)
      .patch(`/api/admin/guides/${guideId}/verification`)
      .set(auth(adminToken))
      .send({ status: 'APPROVED' })
      .expect(200);
    const history = await request(server)
      .get(`/api/verification/admin/users/${guide.user.id}`)
      .set(auth(adminToken))
      .expect(200);
    expect(
      history.body.reviews.map((review: { status: string }) => review.status),
    ).toEqual(['APPROVED', 'REJECTED']);
    expect(history.body.reviews[0].reviewerId).toBeTruthy();
    await request(server)
      .get('/api/guides/me/bookings')
      .set(auth(guide.accessToken))
      .expect(200);
  });
  it('removes guides with expired credentials from the public catalogue and keeps their current work', async () => {
    const db = app.get(DataSource);
    await request(server).get(`/api/guides/${guideId}`).expect(200);
    await db.query(
      "UPDATE guide_documents SET expires_at='2020-01-01' WHERE guide_profile_id=$1 AND type='FIRST_AID'",
      [guideId],
    );
    try {
      await request(server).get(`/api/guides/${guideId}`).expect(404);
      await request(server)
        .get('/api/guides/me/bookings')
        .set(auth(guide.accessToken))
        .expect(200);
    } finally {
      await db.query(
        "UPDATE guide_documents SET expires_at='2030-12-31' WHERE guide_profile_id=$1 AND type='FIRST_AID'",
        [guideId],
      );
    }
  });
  it('invalidates an approval if a document is replaced and prevents identity edits', async () => {
    await request(server)
      .patch('/api/users/me')
      .set(auth(guide.accessToken))
      .send({ firstName: 'Otra persona' })
      .expect(400);
    await request(server)
      .post('/api/guides/me/documents')
      .set(auth(guide.accessToken))
      .field('type', 'FIRST_AID')
      .field('expiresAt', '2031-12-31')
      .attach('file', PDF, 'replacement.pdf')
      .expect(201);
    await request(server)
      .get('/api/guides/me')
      .set(auth(guide.accessToken))
      .expect(200)
      .expect((response) =>
        expect(response.body.verificationStatus).toBe('PENDING'),
      );
    await request(server).get(`/api/guides/${guideId}`).expect(404);
    await request(server)
      .get('/api/guides/me/bookings')
      .set(auth(guide.accessToken))
      .expect(200);
    await request(server)
      .post(
        '/api/guides/me/bookings/00000000-0000-4000-8000-000000000000/accept',
      )
      .set(auth(guide.accessToken))
      .expect(403)
      .expect((response) =>
        expect(response.body.error).toBe('DOCUMENTS_IN_REVIEW'),
      );
  });
  it('keeps registration durable when the verification service is unavailable', async () => {
    const client = app.get(VerificationClient);
    const unavailable = vi
      .spyOn(client, 'call')
      .mockRejectedValue(new Error('Simulated verification outage'));
    let session: typeof tourist;
    try {
      session = (
        await request(server)
          .post('/api/auth/register')
          .send({
            firstName: 'Pendiente',
            lastName: 'Demo',
            email: `outage.${suffix}@example.com`,
            password: 'Sendero2026',
          })
          .expect(201)
      ).body;
      const rows = await app
        .get(DataSource)
        .query(
          "SELECT id FROM nest_outbox.messages WHERE topic='account.verification' AND payload->>'userId'=$1",
          [session.user.id],
        );
      expect(rows.length).toBe(1);
      await request(server)
        .post('/api/bookings')
        .set(auth(session.accessToken))
        .send({})
        .expect(403);
    } finally {
      unavailable.mockRestore();
    }
    await request(server)
      .get('/api/verification/me')
      .set(auth(session!.accessToken))
      .expect(200);
    const token = await confirmationToken(session!.user.email);
    await request(server)
      .post('/api/verification/email/confirm')
      .send({ token })
      .expect(200);
  });
});
