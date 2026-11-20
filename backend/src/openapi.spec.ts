import type { OpenAPIObject } from '@nestjs/swagger';
import { undocumentedOperations } from './openapi.js';

const documentWith = (paths: OpenAPIObject['paths']): OpenAPIObject => ({
  openapi: '3.0.0',
  info: { title: 'test', version: '1' },
  paths,
});

describe('OpenAPI checks', () => {
  it('accepts operations with summary, tags and a success response', () => {
    const document = documentWith({
      '/api/routes': {
        get: {
          summary: 'Listar rutas',
          tags: ['Routes'],
          responses: { '200': { description: 'ok' } },
        },
      },
    });
    expect(undocumentedOperations(document)).toEqual([]);
  });

  it('lists what each operation is missing', () => {
    const document = documentWith({
      '/api/things': {
        post: {
          tags: [],
          responses: { '400': { description: 'bad' } },
        },
      },
    });
    expect(undocumentedOperations(document)).toEqual([
      {
        method: 'POST',
        path: '/api/things',
        missing: ['summary', 'tags', 'success response'],
      },
    ]);
  });
});
