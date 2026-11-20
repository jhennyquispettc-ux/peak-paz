import { confirmTestEmail } from './helpers/confirm-email.js';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { DataSource } from 'typeorm';
import { AppModule } from './../src/app.module.js';
import { configureApp } from './../src/app.setup.js';
import { Route } from './../src/modules/routes/entities/route.entity.js';
import { Species } from './../src/modules/routes/entities/species.entity.js';
import { User } from './../src/modules/users/entities/user.entity.js';

describe('Routes (e2e)', () => {
  let app: INestApplication<App>;
  let server: App;
  let adminToken: string;
  let touristToken: string;
  let routeId: string;
  let speciesId: string;

  const suffix = Date.now();
  const slug = `e2e-takesi-${suffix}`;
  const touristEmail = `e2e.routes.${suffix}@example.com`;

  const newRoute = {
    slug,
    nameEs: `Takesi prueba ${suffix}`,
    nameEn: `Takesi test ${suffix}`,
    descriptionEs: 'Ruta de prueba sobre un camino prehispánico.',
    descriptionEn: 'Test route over a pre-Hispanic trail.',
    difficulty: 'MODERATE',
    autonomyLevel: 'GUIDE_RECOMMENDED',
    days: 2,
    distanceKm: 23.5,
    elevationGainM: 300,
    elevationLossM: 3000,
    maxAltitudeM: 4650,
    startTimeFrom: '06:00',
    startTimeTo: '08:00',
    howToGetThereEs: 'Minibús desde Villa Fátima hasta Choquekhota.',
    howToGetThereEn: 'Minibus from Villa Fátima to Choquekhota.',
    emergencyContacts: 'Policía 110',
    startLatitude: -16.4,
    startLongitude: -67.95,
    privatePrice: 120,
    groupMinPrice: 80,
    groupMaxPeople: 12,
  };

  const admin = () => ({ Authorization: `Bearer ${adminToken}` });

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

    const register = await request(server)
      .post('/api/auth/register')
      .send({
        email: touristEmail,
        password: 'Trekking2026',
        firstName: 'Ana',
        lastName: 'Müller',
      })
      .expect(201);
    await confirmTestEmail(server, register.body);
    touristToken = register.body.accessToken;
  });

  afterAll(async () => {
    const dataSource = app.get(DataSource);
    await dataSource.getRepository(Route).delete({ slug });
    if (speciesId) {
      await dataSource.getRepository(Species).delete({ id: speciesId });
    }
    await dataSource.getRepository(User).delete({ email: touristEmail });
    await app.close();
  });

  it('keeps the admin endpoints away from tourists', async () => {
    const response = await request(server)
      .post('/api/admin/routes')
      .set('Authorization', `Bearer ${touristToken}`)
      .send(newRoute)
      .expect(403);
    expect(response.body.error).toBe('INSUFFICIENT_ROLE');
  });

  it('rejects a start window that ends before it begins', async () => {
    const response = await request(server)
      .post('/api/admin/routes')
      .set(admin())
      .send({ ...newRoute, startTimeFrom: '09:00', startTimeTo: '07:00' })
      .expect(400);
    expect(response.body.error).toBe('INVALID_START_WINDOW');
  });

  it('creates the route as an unpublished draft', async () => {
    const response = await request(server)
      .post('/api/admin/routes')
      .set(admin())
      .send(newRoute)
      .expect(201);

    routeId = response.body.id;
    expect(response.body.isPublished).toBe(false);
    expect(response.body.startTimeFrom).toBe('06:00');

    await request(server).get(`/api/routes/${slug}`).expect(404);
  });

  it('rejects a duplicated slug', async () => {
    const response = await request(server)
      .post('/api/admin/routes')
      .set(admin())
      .send(newRoute)
      .expect(409);
    expect(response.body.error).toBe('ALREADY_EXISTS');
  });

  it('does not publish a route without itinerary stops', async () => {
    const response = await request(server)
      .patch(`/api/admin/routes/${routeId}/publication`)
      .set(admin())
      .send({ isPublished: true })
      .expect(400);
    expect(response.body.error).toBe('ROUTE_NOT_READY');
  });

  it('validates the itinerary fields of a point', async () => {
    const response = await request(server)
      .post(`/api/admin/routes/${routeId}/points`)
      .set(admin())
      .send({
        type: 'START',
        nameEs: 'Choquekhota',
        nameEn: 'Choquekhota',
        latitude: -16.4,
        longitude: -67.95,
        isItineraryStop: true,
      })
      .expect(400);
    expect(response.body.error).toBe('INVALID_ITINERARY_STOP');
  });

  it('adds stops, gear and species to the route', async () => {
    const stops = [
      {
        type: 'START',
        nameEs: 'Choquekhota',
        stageOrder: 1,
        dayNumber: 1,
        minutesFromPrevious: 0,
      },
      {
        type: 'CAMPSITE',
        nameEs: 'Takesi',
        stageOrder: 2,
        dayNumber: 1,
        minutesFromPrevious: 360,
        isOvernight: true,
      },
      {
        type: 'CAMPSITE',
        nameEs: 'Takesi',
        stageOrder: 3,
        dayNumber: 2,
        minutesFromPrevious: 0,
      },
      {
        type: 'END',
        nameEs: 'Yanacachi',
        stageOrder: 4,
        dayNumber: 2,
        minutesFromPrevious: 300,
      },
    ];
    for (const point of stops) {
      await request(server)
        .post(`/api/admin/routes/${routeId}/points`)
        .set(admin())
        .send({
          ...point,
          nameEn: point.nameEs,
          latitude: -16.4,
          longitude: -67.95,
          isItineraryStop: true,
        })
        .expect(201);
    }

    const duplicated = await request(server)
      .post(`/api/admin/routes/${routeId}/points`)
      .set(admin())
      .send({
        ...stops[0],
        nameEn: 'Again',
        latitude: -16.4,
        longitude: -67.95,
        isItineraryStop: true,
      })
      .expect(409);
    expect(duplicated.body.error).toBe('ALREADY_EXISTS');

    await request(server)
      .post(`/api/admin/routes/${routeId}/gear`)
      .set(admin())
      .send({
        category: 'CLOTHING',
        descriptionEs: 'Chamarra impermeable',
        descriptionEn: 'Waterproof jacket',
        isRequired: true,
      })
      .expect(201);

    const species = await request(server)
      .post('/api/admin/species')
      .set(admin())
      .send({
        commonNameEs: 'Cóndor andino',
        commonNameEn: 'Andean condor',
        scientificName: 'Vultur gryphus',
        kind: 'FAUNA',
      })
      .expect(201);
    speciesId = species.body.id;

    await request(server)
      .put(`/api/admin/routes/${routeId}/species`)
      .set(admin())
      .send({ speciesIds: [speciesId] })
      .expect(200);
  });

  it('publishes the route and shows it in the public catalog', async () => {
    await request(server)
      .patch(`/api/admin/routes/${routeId}/publication`)
      .set(admin())
      .send({ isPublished: true })
      .expect(200);

    const list = await request(server)
      .get('/api/routes')
      .query({ search: `Takesi prueba ${suffix}` })
      .expect(200);
    expect(list.body.meta.total).toBe(1);

    const detail = await request(server).get(`/api/routes/${slug}`).expect(200);
    expect(
      detail.body.pointsOfInterest.map(
        (p: { stageOrder: number }) => p.stageOrder,
      ),
    ).toEqual([1, 2, 3, 4]);
    expect(detail.body.gearRecommendations).toHaveLength(1);
    expect(detail.body.species[0].scientificName).toBe('Vultur gryphus');
  });

  it('calculates the itinerary from the chosen start time', async () => {
    const response = await request(server)
      .get(`/api/routes/${slug}/itinerary`)
      .query({ startTime: '07:30' })
      .expect(200);

    expect(
      response.body.stops.map((s: { arrivalTime: string }) => s.arrivalTime),
    ).toEqual(['07:30', '13:30', '07:30', '12:30']);

    const outside = await request(server)
      .get(`/api/routes/${slug}/itinerary`)
      .query({ startTime: '10:00' })
      .expect(400);
    expect(outside.body.error).toBe('START_TIME_OUTSIDE_WINDOW');
  });

  it('imports a GPX track and updates the route figures', async () => {
    const gpx = `<?xml version="1.0"?><gpx version="1.1" xmlns="http://www.topografix.com/GPX/1/1"><trk><trkseg>
      <trkpt lat="-16.400" lon="-67.950"><ele>4400</ele></trkpt>
      <trkpt lat="-16.410" lon="-67.950"><ele>4650</ele></trkpt>
      <trkpt lat="-16.430" lon="-67.950"><ele>3900</ele></trkpt>
    </trkseg></trk></gpx>`;

    const response = await request(server)
      .post(`/api/admin/routes/${routeId}/track`)
      .set(admin())
      .attach('file', Buffer.from(gpx), 'takesi.gpx')
      .expect(201);

    expect(response.body).toMatchObject({
      points: 3,
      distanceKm: 3.3,
      elevationGainM: 250,
      elevationLossM: 750,
      maxAltitudeM: 4650,
    });

    const detail = await request(server).get(`/api/routes/${slug}`).expect(200);
    expect(detail.body.track.coordinates).toHaveLength(3);
    expect(detail.body.distanceKm).toBe(3.3);

    const missing = await request(server)
      .post(`/api/admin/routes/${routeId}/track`)
      .set(admin())
      .expect(400);
    expect(missing.body.error).toBe('GPX_FILE_REQUIRED');
  });

  it('hides the route again after a soft delete', async () => {
    await request(server)
      .delete(`/api/admin/routes/${routeId}`)
      .set(admin())
      .expect(204);

    await request(server).get(`/api/routes/${slug}`).expect(404);
    await request(server)
      .get(`/api/admin/routes/${routeId}`)
      .set(admin())
      .expect(404);
  });
});
