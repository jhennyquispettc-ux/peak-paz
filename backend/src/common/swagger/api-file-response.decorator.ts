import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiProduces } from '@nestjs/swagger';

export function ApiFileResponse() {
  return applyDecorators(
    ApiProduces('application/pdf', 'image/jpeg', 'image/png'),
    ApiOkResponse({
      description: 'Archivo PDF, JPG o PNG',
      schema: { type: 'string', format: 'binary' },
    }),
  );
}
