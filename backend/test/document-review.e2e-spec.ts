import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
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

describe('Document review through RabbitMQ and the Python service', () => {
  let app: INestApplication<App>;
  let server: App;
  let adminToken: string;
  let agencyToken: string;
  let agencyId: string;
  const suffix = Date.now();
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
  const path = () => `/api/admin/document-reviews/AGENCY/${agencyId}`;

  const upload = (type: string) =>
    request(server)
      .post('/api/agencies/me/documents')
      .set(auth(agencyToken))
      .field('type', type)
      .attach('file', PDF, 'document.pdf')
      .expect(201);

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    configureApp(app, 'api');
    await app.listen(
      Number(new URL(process.env.DOCUMENT_BASE_URL ?? '').port),
      '0.0.0.0',
    );
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
        email: `e2e.ocr.${suffix}@example.com`,
        password: 'Agencia2026',
        firstName: 'Lucía',
        lastName: 'Quispe',
        legalName: `Andes Lectura ${suffix} S.R.L.`,
        taxId: String(suffix).slice(-11),
        address: 'Calle Sagárnaga 213, La Paz',
      })
      .expect(201);
    agencyToken = agency.body.accessToken;
    const me = await request(server)
      .get('/api/agencies/me')
      .set(auth(agencyToken))
      .expect(200);
    agencyId = me.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('does not analyze an incomplete file', async () => {
    await upload(DOCUMENTS[0]);
    const latest = await request(server)
      .get(path())
      .set(auth(adminToken))
      .expect(200);
    expect(latest.body.review).toBeNull();
    await request(server).post(path()).set(auth(adminToken)).expect(409);
  });

  it('only lets the administrator read the analysis', async () => {
    await request(server).get(path()).set(auth(agencyToken)).expect(403);
    await request(server).get(path()).expect(401);
  });

  it('rejects a forged file link', async () => {
    const forged = `${randomUUID()}.${randomUUID()}.9999999999.AAAA`;
    await request(server)
      .get(`/api/internal/document-files/${forged}`)
      .expect(404);
  });

  it('analyzes the complete file and never decides for the admin', async () => {
    for (const type of DOCUMENTS.slice(1)) await upload(type);
    let review: {
      status: string;
      recommendation: string;
      documents: [];
    } | null = null;
    for (let attempt = 0; attempt < 120; attempt++) {
      const latest = await request(server)
        .get(path())
        .set(auth(adminToken))
        .expect(200);
      review = latest.body.review;
      if (review && review.status !== 'PENDING') break;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    expect(review?.status).toBe('COMPLETED');
    expect(review?.recommendation).toBe('MANUAL_REVIEW');
    expect(review?.documents).toHaveLength(4);
    const me = await request(server)
      .get('/api/agencies/me')
      .set(auth(agencyToken))
      .expect(200);
    expect(me.body.verificationStatus).toBe('PENDING');
  }, 40_000);
});
