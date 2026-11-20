import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from './../src/app.module.js';
import { configureApp } from './../src/app.setup.js';
import {
  API_VERSION,
  buildOpenApiDocument,
  isExternal,
  undocumentedOperations,
} from './../src/openapi.js';

describe('API contract (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    configureApp(app, 'api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('documents every endpoint with a summary, a tag and a success response', () => {
    const document = buildOpenApiDocument(app);
    expect(document.info.version).toBe(API_VERSION);
    expect(Object.keys(document.paths).length).toBeGreaterThan(50);
    expect(
      undocumentedOperations(document).filter(
        (operation) => !isExternal(operation.path),
      ),
    ).toEqual([]);
  });
});
