import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';

const PDF = Buffer.from('%PDF-1.4\n%demo\n');
const DOCUMENTS = [
  'TAX_ID',
  'COMMERCE_REGISTRATION',
  'MUNICIPAL_LICENSE',
  'REPRESENTATIVE_ID',
];

describe('Provider interviews', () => {
  let app: INestApplication<App>;
  let server: App;
  let adminToken: string;
  let agencyToken: string;
  let agencyId: string;
  let interviewId: string;
  const suffix = Date.now();
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
  const tomorrow = () => new Date(Date.now() + 86_400_000).toISOString();
  const path = () => `/api/admin/interviews/AGENCY/${agencyId}`;
  const approve = () =>
    request(server)
      .patch(`/api/admin/agencies/${agencyId}/verification`)
      .set(auth(adminToken))
      .send({ status: 'APPROVED' });
  const schedule = (body: object) =>
    request(server).post(path()).set(auth(adminToken)).send(body);
  const result = (id: string, body: object) =>
    request(server)
      .patch(`/api/admin/interviews/${id}/result`)
      .set(auth(adminToken))
      .send(body);

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
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
    const agency = await request(server)
      .post('/api/auth/register/agency')
      .send({
        email: `e2e.interview.${suffix}@example.com`,
        password: 'Agencia2026',
        firstName: 'Lucía',
        lastName: 'Quispe',
        legalName: `Andes Entrevista ${suffix} S.R.L.`,
        taxId: String(suffix + 7).slice(-11),
        address: 'Calle Sagárnaga 213, La Paz',
      })
      .expect(201);
    agencyToken = agency.body.accessToken;
    for (const type of DOCUMENTS) {
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
  });

  afterAll(async () => {
    await app.close();
  });

  it('does not approve a provider without an interview', async () => {
    const response = await approve().expect(409);
    expect(response.body.error).toBe('INTERVIEW_REQUIRED');
  });

  it('validates the date and the meeting link', async () => {
    await schedule({
      scheduledAt: '2020-01-01T10:00:00Z',
      modality: 'IN_PERSON',
      location: 'Calle Sagárnaga 213',
    }).expect(400);
    const invalid = await schedule({
      scheduledAt: tomorrow(),
      modality: 'VIRTUAL',
      location: 'javascript:alert(1)',
    }).expect(400);
    expect(invalid.body.error).toBe('INVALID_MEETING_LINK');
  });

  it('schedules one interview and tells the provider', async () => {
    const created = await schedule({
      scheduledAt: tomorrow(),
      modality: 'VIRTUAL',
      location: 'https://meet.example.com/peak-paz',
    }).expect(201);
    interviewId = created.body.id;
    const repeated = await schedule({
      scheduledAt: tomorrow(),
      modality: 'IN_PERSON',
      location: 'Calle Sagárnaga 213',
    }).expect(409);
    expect(repeated.body.error).toBe('INTERVIEW_ALREADY_SCHEDULED');
    const mine = await request(server)
      .get('/api/interviews/me')
      .set(auth(agencyToken))
      .expect(200);
    expect(mine.body.interviews[0].id).toBe(interviewId);
    const notices = await request(server)
      .get('/api/notifications/me?page=1&limit=10')
      .set(auth(agencyToken));
    if (notices.status === 200) {
      expect(
        notices.body.data.some(
          (item: { type: string }) => item.type === 'INTERVIEW_SCHEDULED',
        ),
      ).toBe(true);
    }
    const blocked = await approve().expect(409);
    expect(blocked.body.error).toBe('INTERVIEW_PENDING');
  });

  it('only lets the administrator manage interviews', async () => {
    await request(server).get(path()).set(auth(agencyToken)).expect(403);
    await request(server)
      .patch(`/api/admin/interviews/${interviewId}/result`)
      .set(auth(agencyToken))
      .send({ result: 'PASSED', notes: 'Intento del proveedor.' })
      .expect(403);
  });

  it('requires the visit to the premises of an agency', async () => {
    const response = await result(interviewId, {
      result: 'PASSED',
      notes: 'No se visitó el local.',
    }).expect(400);
    expect(response.body.error).toBe('PREMISES_NOT_VISITED');
  });

  it('blocks approval after a failed interview', async () => {
    await result(interviewId, {
      result: 'FAILED',
      notes: 'El local no corresponde a la dirección.',
    }).expect(200);
    const blocked = await approve().expect(409);
    expect(blocked.body.error).toBe('INTERVIEW_FAILED');
    await result(interviewId, {
      result: 'PASSED',
      notes: 'Intento de corregir el resultado.',
      premisesVisited: true,
    }).expect(409);
  });

  it('approves only after a passed interview', async () => {
    const next = await schedule({
      scheduledAt: tomorrow(),
      modality: 'IN_PERSON',
      location: 'Calle Sagárnaga 213, La Paz',
    }).expect(201);
    await result(next.body.id, {
      result: 'PASSED',
      notes: 'Se visitó el local y coincide.',
      premisesVisited: true,
    }).expect(200);
    const overview = await request(server)
      .get(path())
      .set(auth(adminToken))
      .expect(200);
    expect(overview.body.approval.canApprove).toBe(true);
    const approved = await approve().expect(200);
    expect(approved.body.verificationStatus).toBe('APPROVED');
  });
});
