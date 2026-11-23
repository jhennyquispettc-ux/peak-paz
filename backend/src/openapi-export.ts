import { NestFactory } from '@nestjs/core';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { AppModule } from './app.module.js';
import { configureApp } from './app.setup.js';
import { AppConfig } from './config/app.config.js';
import {
  buildOpenApiDocument,
  isExternal,
  undocumentedOperations,
} from './openapi.js';

const target = resolve(import.meta.dirname, '..', '..', 'docs', 'openapi.json');

const app = await NestFactory.create(AppModule, { logger: ['error'] });
try {
  configureApp(app, app.get(AppConfig).apiPrefix);
  const document = buildOpenApiDocument(app);
  const problems = undocumentedOperations(document);
  const own = problems.filter((problem) => !isExternal(problem.path));
  const external = problems.filter((problem) => isExternal(problem.path));
  for (const problem of external) {
    console.warn(
      `Pending in another module: ${problem.method} ${problem.path} (${problem.missing.join(', ')})`,
    );
  }
  if (own.length > 0) {
    console.error(JSON.stringify(own, null, 2));
    process.exitCode = 1;
  } else {
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, `${JSON.stringify(document, null, 2)}\n`);
    const operations = Object.values(document.paths).flatMap((item) =>
      Object.keys(item),
    ).length;
    console.log(`${operations} operations written to ${target}`);
  }
} finally {
  await app.close();
}
