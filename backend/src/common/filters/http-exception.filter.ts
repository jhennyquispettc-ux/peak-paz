import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';
import { ErrorResponseDto } from '../dto/error-response.dto.js';

const PG_UNIQUE_VIOLATION = '23505';
const PG_FOREIGN_KEY_VIOLATION = '23503';
const PG_CHECK_VIOLATION = '23514';

const STATUS_CODES: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'UNPROCESSABLE_ENTITY',
  429: 'TOO_MANY_REQUESTS',
};

interface ResolvedError {
  status: number;
  error: string;
  message: string | string[];
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();
    const { status, error, message } = this.resolve(exception);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `[${request.method}] ${request.url} -> ${status}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    const body: ErrorResponseDto = {
      statusCode: status,
      error,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    response.status(status).json(body);
  }

  private resolve(exception: unknown): ResolvedError {
    if (exception instanceof HttpException) {
      return this.fromHttpException(exception);
    }
    if (exception instanceof QueryFailedError) {
      const resolved = this.fromDatabaseError(exception);
      if (resolved) return resolved;
    }
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error.',
    };
  }

  private fromHttpException(exception: HttpException): ResolvedError {
    const status = exception.getStatus();
    const body = exception.getResponse();
    const fallbackCode = STATUS_CODES[status] ?? 'HTTP_ERROR';

    if (typeof body === 'string') {
      return { status, error: fallbackCode, message: body };
    }

    const { message, error } = body as {
      message?: string | string[];
      error?: string;
    };
    const isDomainCode =
      typeof error === 'string' && /^[A-Z0-9_]+$/.test(error);

    return {
      status,
      error: isDomainCode ? error : fallbackCode,
      message: message ?? exception.message,
    };
  }

  private fromDatabaseError(exception: QueryFailedError): ResolvedError | null {
    const code = (exception.driverError as { code?: string } | undefined)?.code;

    switch (code) {
      case PG_UNIQUE_VIOLATION:
        return {
          status: HttpStatus.CONFLICT,
          error: 'ALREADY_EXISTS',
          message: 'A record with that value already exists.',
        };
      case PG_FOREIGN_KEY_VIOLATION:
        return {
          status: HttpStatus.BAD_REQUEST,
          error: 'INVALID_REFERENCE',
          message: 'One of the referenced records does not exist.',
        };
      case PG_CHECK_VIOLATION:
        return {
          status: HttpStatus.BAD_REQUEST,
          error: 'BUSINESS_RULE_VIOLATION',
          message: 'The data breaks one of the model rules.',
        };
      default:
        return null;
    }
  }
}
