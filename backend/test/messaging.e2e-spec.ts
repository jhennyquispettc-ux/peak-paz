import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { configureApp } from './../src/app.setup.js';

describe('RabbitMQ messaging (e2e)', () => {
  let app: INestApplication<App>;
  let server: App;
  let adminToken: string;

  const auth = () => ({ Authorization: `Bearer ${adminToken}` });

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
  });

  afterAll(async () => {
    await app.close();
  });

  it('protects the messaging endpoints', async () => {
    await request(server).post('/api/admin/messaging/ping').expect(401);
  });

  it('reaches the Python service through RabbitMQ', async () => {
    for (let attempt = 0; attempt < 50; attempt++) {
      const status = await request(server)
        .get('/api/admin/messaging/status')
        .set(auth())
        .expect(200);
      if (status.body.connected) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    const pong = await request(server)
      .post('/api/admin/messaging/ping')
      .set(auth())
      .expect(200);
    expect(pong.body).toMatchObject({
      service: 'verification-python',
      version: '0.2.0',
    });
    expect(pong.body.roundTripMs).toBeGreaterThanOrEqual(0);
  });
});
