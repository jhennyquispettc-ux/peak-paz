import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { DataSource } from 'typeorm';
import { AppModule } from './../src/app.module.js';
import { configureApp } from './../src/app.setup.js';
import { Agency } from './../src/modules/agencies/entities/agency.entity.js';
import { GuideProfile } from './../src/modules/guides/entities/guide-profile.entity.js';
import { Route } from './../src/modules/routes/entities/route.entity.js';
import { User } from './../src/modules/users/entities/user.entity.js';

const PDF = Buffer.from('%PDF-1.4\n1 0 obj << >> endobj\n%%EOF');

describe('Provider verification (e2e)', () => {
  let app: INestApplication<App>;
  let server: App;
  let adminToken: string;
  let guideToken: string;
  let guideId: string;
  let agencyToken: string;
  let agencyId: string;
  let routeId: string;
  let guideRouteId: string;
  let credentialDocumentId: string;

  const suffix = Date.now();
  const guideEmail = `e2e.guide.${suffix}@example.com`;
  const agencyEmail = `e2e.agency.${suffix}@example.com`;
  const taxId = String(suffix).slice(-12);
  const slug = `e2e-provider-route-${suffix}`;

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  const uploadDocument = (
    path: string,
    token: string,
    type: string,
    content: Buffer = PDF,
    expiresAt?: string,
  ) => {
    const call = request(server)
      .post(path)
      .set(auth(token))
      .field('type', type)
      .attach('file', content, 'document.pdf');
    return expiresAt ? call.field('expiresAt', expiresAt) : call;
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
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

    const route = await request(server)
      .post('/api/admin/routes')
      .set(auth(adminToken))
      .send({
        slug,
        nameEs: `Ruta proveedores ${suffix}`,
        nameEn: `Provider route ${suffix}`,
        descriptionEs: 'Ruta creada para la prueba de proveedores.',
        descriptionEn: 'Route created for the provider test.',
        difficulty: 'EASY',
        autonomyLevel: 'SELF_GUIDED',
        days: 1,
        distanceKm: 8,
        elevationGainM: 200,
        elevationLossM: 600,
        maxAltitudeM: 4100,
        startTimeFrom: '07:00',
        startTimeTo: '09:00',
        howToGetThereEs: 'Minibús desde la plaza principal.',
        howToGetThereEn: 'Minibus from the main square.',
        emergencyContacts: 'Policía 110',
        startLatitude: -16.5,
        startLongitude: -68.1,
        privatePrice: 60,
        groupMinPrice: 40,
        groupMaxPeople: 10,
      })
      .expect(201);
    routeId = route.body.id;

    for (const [order, type] of [
      [1, 'START'],
      [2, 'END'],
    ] as const) {
      await request(server)
        .post(`/api/admin/routes/${routeId}/points`)
        .set(auth(adminToken))
        .send({
          type,
          nameEs: type,
          nameEn: type,
          latitude: -16.5,
          longitude: -68.1,
          isItineraryStop: true,
          stageOrder: order,
          dayNumber: 1,
          minutesFromPrevious: order === 1 ? 0 : 180,
        })
        .expect(201);
    }
    await request(server)
      .patch(`/api/admin/routes/${routeId}/publication`)
      .set(auth(adminToken))
      .send({ isPublished: true })
      .expect(200);
  });

  afterAll(async () => {
    const dataSource = app.get(DataSource);
    await dataSource.getRepository(GuideProfile).delete({ id: guideId });
    await dataSource.getRepository(Agency).delete({ id: agencyId });
    await dataSource.getRepository(User).delete({ email: guideEmail });
    await dataSource.getRepository(User).delete({ email: agencyEmail });
    await dataSource.getRepository(Route).delete({ slug });
    await rm(join('uploads', 'guides', guideId), {
      recursive: true,
      force: true,
    });
    await rm(join('uploads', 'agencies', agencyId), {
      recursive: true,
      force: true,
    });
    await app.close();
  });

  describe('guides', () => {
    it('registers a guide as pending with every document missing', async () => {
      const register = await request(server)
        .post('/api/auth/register/guide')
        .send({
          email: guideEmail,
          password: 'Montana2026',
          firstName: 'Juan',
          lastName: 'Mamani',
          nationalId: '6123456-1B',
          languages: ['es', 'ay', 'en'],
          yearsExperience: 6,
        })
        .expect(201);
      expect(register.body.user.role).toBe('GUIDE');
      guideToken = register.body.accessToken;

      const me = await request(server)
        .get('/api/guides/me')
        .set(auth(guideToken))
        .expect(200);
      guideId = me.body.id;
      expect(me.body.verificationStatus).toBe('PENDING');
      expect(me.body.missingDocuments).toEqual([
        'NATIONAL_ID',
        'GUIDE_CREDENTIAL',
        'FIRST_AID',
      ]);
    });

    it('keeps the guide panel closed to other roles', async () => {
      const response = await request(server)
        .get('/api/guides/me')
        .set(auth(adminToken))
        .expect(403);
      expect(response.body.error).toBe('INSUFFICIENT_ROLE');
    });

    it('rejects files that are not PDF, JPG or PNG and expired documents', async () => {
      const fake = await uploadDocument(
        '/api/guides/me/documents',
        guideToken,
        'NATIONAL_ID',
        Buffer.from('MZ fake executable'),
      ).expect(400);
      expect(fake.body.error).toBe('INVALID_DOCUMENT_FILE');

      const expired = await uploadDocument(
        '/api/guides/me/documents',
        guideToken,
        'FIRST_AID',
        PDF,
        '2020-01-01',
      ).expect(400);
      expect(expired.body.error).toBe('DOCUMENT_EXPIRED');
    });

    it('does not let the admin approve a guide with missing documents', async () => {
      const response = await request(server)
        .patch(`/api/admin/guides/${guideId}/verification`)
        .set(auth(adminToken))
        .send({ status: 'APPROVED' })
        .expect(400);
      expect(response.body.error).toBe('DOCUMENTS_INCOMPLETE');
    });

    it('stores the documents and replaces one of the same type', async () => {
      for (const type of ['NATIONAL_ID', 'GUIDE_CREDENTIAL', 'FIRST_AID']) {
        await uploadDocument(
          '/api/guides/me/documents',
          guideToken,
          type,
          PDF,
          '2030-12-31',
        ).expect(201);
      }
      const replacement = await uploadDocument(
        '/api/guides/me/documents',
        guideToken,
        'GUIDE_CREDENTIAL',
        PDF,
        '2031-06-30',
      ).expect(201);
      credentialDocumentId = replacement.body.id;

      const me = await request(server)
        .get('/api/guides/me')
        .set(auth(guideToken))
        .expect(200);
      expect(me.body.documents).toHaveLength(3);
      expect(me.body.missingDocuments).toEqual([]);
      expect(me.body.documents[0]).not.toHaveProperty('url');

      const file = await request(server)
        .get(`/api/guides/me/documents/${credentialDocumentId}/file`)
        .set(auth(guideToken))
        .buffer(true)
        .expect(200)
        .expect('Content-Type', 'application/pdf');
      expect(Buffer.from(file.body as Buffer).equals(PDF)).toBe(true);
    });

    it('requires a reason to reject and lets the guide ask for a new review', async () => {
      const noReason = await request(server)
        .patch(`/api/admin/guides/${guideId}/verification`)
        .set(auth(adminToken))
        .send({ status: 'REJECTED' })
        .expect(400);
      expect(noReason.body.error).toBe('BAD_REQUEST');

      const rejected = await request(server)
        .patch(`/api/admin/guides/${guideId}/verification`)
        .set(auth(adminToken))
        .send({
          status: 'REJECTED',
          rejectionReason: 'La foto de la credencial no se lee.',
        })
        .expect(200);
      expect(rejected.body.verificationStatus).toBe('REJECTED');

      const blocked = await request(server)
        .post('/api/guides/me/routes')
        .set(auth(guideToken))
        .send({ routeId })
        .expect(403);
      expect(blocked.body.error).toBe('PROVIDER_NOT_APPROVED');

      const review = await request(server)
        .post('/api/guides/me/verification-request')
        .set(auth(guideToken))
        .expect(200);
      expect(review.body.verificationStatus).toBe('PENDING');
      expect(review.body.rejectionReason).toBeNull();
    });

    it('approves the guide and locks the identity data', async () => {
      const list = await request(server)
        .get('/api/admin/guides')
        .query({ status: 'PENDING', search: guideEmail })
        .set(auth(adminToken))
        .expect(200);
      expect(list.body.data[0]).toMatchObject({
        id: guideId,
        documentsComplete: true,
      });

      await request(server)
        .get(
          `/api/admin/guides/${guideId}/documents/${credentialDocumentId}/file`,
        )
        .set(auth(adminToken))
        .expect(200);

      const approved = await request(server)
        .patch(`/api/admin/guides/${guideId}/verification`)
        .set(auth(adminToken))
        .send({ status: 'APPROVED' })
        .expect(200);
      expect(approved.body.verificationStatus).toBe('APPROVED');

      const locked = await request(server)
        .patch('/api/guides/me')
        .set(auth(guideToken))
        .send({ nationalId: '7654321' })
        .expect(400);
      expect(locked.body.error).toBe('PROFILE_LOCKED');

      await request(server)
        .patch('/api/guides/me')
        .set(auth(guideToken))
        .send({ yearsExperience: 7 })
        .expect(200);
    });

    it('authorizes the guide for a route after the admin review', async () => {
      const requested = await request(server)
        .post('/api/guides/me/routes')
        .set(auth(guideToken))
        .send({ routeId })
        .expect(201);
      expect(requested.body.status).toBe('PENDING');
      guideRouteId = requested.body.id;

      const again = await request(server)
        .post('/api/guides/me/routes')
        .set(auth(guideToken))
        .send({ routeId })
        .expect(409);
      expect(again.body.error).toBe('GUIDE_ROUTE_ALREADY_REQUESTED');

      const decided = await request(server)
        .patch(`/api/admin/guide-routes/${guideRouteId}`)
        .set(auth(adminToken))
        .send({ status: 'APPROVED' })
        .expect(200);
      expect(decided.body).toMatchObject({
        status: 'APPROVED',
        guideName: 'Juan Mamani',
        routeSlug: slug,
      });

      const me = await request(server)
        .get('/api/guides/me')
        .set(auth(guideToken))
        .expect(200);
      expect(me.body.routes[0].status).toBe('APPROVED');
    });
  });

  describe('agencies', () => {
    const agency = {
      email: agencyEmail,
      password: 'Agencia2026',
      firstName: 'Lucía',
      lastName: 'Quispe',
      legalName: `Andes Trekking ${suffix} S.R.L.`,
      taxId,
      operatorLicense: 'RNT-LP-0421',
      association: 'ASOGUIA La Paz',
      address: 'Calle Sagárnaga 213, La Paz',
    };

    it('registers an agency and blocks a repeated tax id', async () => {
      const register = await request(server)
        .post('/api/auth/register/agency')
        .send(agency)
        .expect(201);
      expect(register.body.user.role).toBe('AGENCY');
      agencyToken = register.body.accessToken;

      const repeated = await request(server)
        .post('/api/auth/register/agency')
        .send({ ...agency, email: `other.${agencyEmail}` })
        .expect(409);
      expect(repeated.body.error).toBe('TAX_ID_ALREADY_REGISTERED');

      const me = await request(server)
        .get('/api/agencies/me')
        .set(auth(agencyToken))
        .expect(200);
      agencyId = me.body.id;
      expect(me.body.missingDocuments).toHaveLength(4);
    });

    it('approves the agency once all four documents are uploaded', async () => {
      for (const type of [
        'TAX_ID',
        'OPERATOR_LICENSE',
        'ASSOCIATION_CERTIFICATE',
        'REPRESENTATIVE_ID',
      ]) {
        await uploadDocument(
          '/api/agencies/me/documents',
          agencyToken,
          type,
        ).expect(201);
      }

      const approved = await request(server)
        .patch(`/api/admin/agencies/${agencyId}/verification`)
        .set(auth(adminToken))
        .send({ status: 'APPROVED' })
        .expect(200);
      expect(approved.body.verificationStatus).toBe('APPROVED');
      expect(approved.body.missingDocuments).toEqual([]);
    });

    it('locks the legal data but allows the address to change', async () => {
      const locked = await request(server)
        .patch('/api/agencies/me')
        .set(auth(agencyToken))
        .send({ legalName: 'Otra Razón Social S.A.' })
        .expect(400);
      expect(locked.body.error).toBe('PROFILE_LOCKED');

      const updated = await request(server)
        .patch('/api/agencies/me')
        .set(auth(agencyToken))
        .send({ address: 'Av. Illampu 800, La Paz' })
        .expect(200);
      expect(updated.body.address).toBe('Av. Illampu 800, La Paz');
    });
  });
});
