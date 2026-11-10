import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { DataSource } from 'typeorm';
import { AppModule } from './../src/app.module.js';
import { configureApp } from './../src/app.setup.js';
import { User } from './../src/modules/users/entities/user.entity.js';

describe('Auth and users (e2e)', () => {
  let app: INestApplication<App>;
  let server: App;
  let touristToken: string;
  let touristId: string;
  let adminToken: string;

  const tourist = {
    email: `e2e.tourist.${Date.now()}@example.com`,
    password: 'Trekking2026',
    firstName: 'Ana',
    lastName: 'Müller',
    country: 'CH',
    language: 'en',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app, 'api');
    await app.init();
    server = app.getHttpServer();
  });

  afterAll(async () => {
    await app
      .get(DataSource)
      .getRepository(User)
      .delete({ email: tourist.email });
    await app.close();
  });

  it('registers a tourist and returns a token', async () => {
    const response = await request(server)
      .post('/api/auth/register')
      .send(tourist)
      .expect(201);

    expect(response.body.tokenType).toBe('Bearer');
    expect(response.body.user.role).toBe('TOURIST');
    expect(response.body.user).not.toHaveProperty('passwordHash');
    touristToken = response.body.accessToken;
    touristId = response.body.user.id;
  });

  it('rejects a second registration with the same email', async () => {
    const response = await request(server)
      .post('/api/auth/register')
      .send({ ...tourist, email: tourist.email.toUpperCase() })
      .expect(409);

    expect(response.body.error).toBe('EMAIL_ALREADY_REGISTERED');
  });

  it('rejects a weak password with a validation error', async () => {
    const response = await request(server)
      .post('/api/auth/register')
      .send({ ...tourist, email: 'weak@example.com', password: 'onlyletters' })
      .expect(400);

    expect(response.body.error).toBe('BAD_REQUEST');
  });

  it('rejects a wrong password', async () => {
    const response = await request(server)
      .post('/api/auth/login')
      .send({ email: tourist.email, password: 'Wrong2026' })
      .expect(401);

    expect(response.body.error).toBe('INVALID_CREDENTIALS');
  });

  it('logs in with the right password', async () => {
    const response = await request(server)
      .post('/api/auth/login')
      .send({ email: tourist.email, password: tourist.password })
      .expect(200);

    expect(response.body.user.email).toBe(tourist.email);
  });

  it('requires a token for protected routes', async () => {
    const response = await request(server).get('/api/users/me').expect(401);

    expect(response.body.error).toBe('INVALID_TOKEN');
  });

  it('returns and updates the own profile', async () => {
    await request(server)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${touristToken}`)
      .expect(200)
      .expect((response) => {
        expect(response.body.id).toBe(touristId);
      });

    const response = await request(server)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${touristToken}`)
      .send({ phone: '+41 79 123 45 67' })
      .expect(200);

    expect(response.body.phone).toBe('+41 79 123 45 67');
  });

  it('blocks a tourist from admin routes', async () => {
    const response = await request(server)
      .get('/api/users')
      .set('Authorization', `Bearer ${touristToken}`)
      .expect(403);

    expect(response.body.error).toBe('INSUFFICIENT_ROLE');
  });

  it('lets the admin list users', async () => {
    const login = await request(server)
      .post('/api/auth/login')
      .send({
        email: process.env.SEED_ADMIN_EMAIL,
        password: process.env.SEED_ADMIN_PASSWORD,
      })
      .expect(200);
    adminToken = login.body.accessToken;

    const response = await request(server)
      .get('/api/users')
      .query({ role: 'TOURIST', search: tourist.email })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body.meta.total).toBe(1);
    expect(response.body.data[0].id).toBe(touristId);
  });

  it('cuts access as soon as the admin suspends the tourist', async () => {
    await request(server)
      .patch(`/api/users/${touristId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'SUSPENDED' })
      .expect(200);

    const me = await request(server)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${touristToken}`)
      .expect(403);
    expect(me.body.error).toBe('USER_SUSPENDED');

    const login = await request(server)
      .post('/api/auth/login')
      .send({ email: tourist.email, password: tourist.password })
      .expect(403);
    expect(login.body.error).toBe('USER_SUSPENDED');
  });
});
