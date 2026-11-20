import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { configureApp } from './app.setup.js';
import { AppConfig } from './config/app.config.js';
import { buildOpenApiDocument } from './openapi.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(AppConfig);

  configureApp(app, config.apiPrefix);

  const docsPath = `${config.apiPrefix}/docs`;
  if (!config.isProduction) {
    const document = buildOpenApiDocument(app);
    SwaggerModule.setup(docsPath, app, document);
  }

  await app.listen(config.port);

  const url = `http://localhost:${config.port}`;
  Logger.log(
    `Peak Paz API listening on ${url}/${config.apiPrefix}`,
    'Bootstrap',
  );
  if (!config.isProduction)
    Logger.log(`Swagger available at ${url}/${docsPath}`, 'Bootstrap');
}

await bootstrap();
