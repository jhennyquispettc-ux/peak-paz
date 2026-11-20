import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';

export const API_VERSION = '0.8.0';

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete'] as const;

export const EXTERNAL_MODULE_PATHS = ['/api/verification/'];

export function isExternal(path: string): boolean {
  return EXTERNAL_MODULE_PATHS.some((prefix) => path.startsWith(prefix));
}

export interface UndocumentedOperation {
  method: string;
  path: string;
  missing: string[];
}

export function buildOpenApiDocument(app: INestApplication): OpenAPIObject {
  return SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Peak Paz API')
      .setDescription(
        'Rutas, reservas de guías, salidas grupales, pagos, sanciones, disputas, reclamos, reseñas y avisos en La Paz',
      )
      .setVersion(API_VERSION)
      .addBearerAuth()
      .build(),
  );
}

export function undocumentedOperations(
  document: OpenAPIObject,
): UndocumentedOperation[] {
  const problems: UndocumentedOperation[] = [];
  for (const [path, item] of Object.entries(document.paths)) {
    for (const method of HTTP_METHODS) {
      const operation = item[method];
      if (!operation) continue;
      const missing: string[] = [];
      if (!operation.summary?.trim()) missing.push('summary');
      if (!operation.tags?.length) missing.push('tags');
      if (
        !Object.keys(operation.responses ?? {}).some((code) => code < '300')
      ) {
        missing.push('success response');
      }
      if (missing.length > 0) {
        problems.push({ method: method.toUpperCase(), path, missing });
      }
    }
  }
  return problems;
}
