import {
  HttpException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface VerificationState {
  userId: string;
  email: string;
  emailVerifiedAt: string | null;
  emailSentAt: string | null;
  nextResendAt: string;
  tokenExpiresAt: string | null;
  reviews: {
    id: string;
    status: string;
    reason: string | null;
    createdAt: string;
    decidedAt: string | null;
    reviewerId: string | null;
  }[];
}

@Injectable()
export class VerificationClient {
  constructor(private readonly config: ConfigService) {}

  async call<T>(path: string, body?: unknown): Promise<T> {
    let response: Response;
    try {
      response = await fetch(
        new URL(
          `/internal${path}`,
          this.config.getOrThrow<string>('VERIFICATION_SERVICE_URL'),
        ),
        {
          method: body === undefined ? 'GET' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Service-Key': this.config.getOrThrow<string>(
              'VERIFICATION_SERVICE_KEY',
            ),
          },
          body: body === undefined ? undefined : JSON.stringify(body),
          signal: AbortSignal.timeout(
            this.config.getOrThrow<number>('VERIFICATION_TIMEOUT_MS'),
          ),
        },
      );
    } catch {
      throw new ServiceUnavailableException({
        error: 'VERIFICATION_UNAVAILABLE',
        message:
          'La verificación no está disponible. Intenta de nuevo en un momento.',
      });
    }
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      message?: string;
    };
    if (!response.ok) {
      if (response.status >= 500 || response.status === 401) {
        throw new ServiceUnavailableException({
          error: 'VERIFICATION_UNAVAILABLE',
          message: 'La verificación no está disponible.',
        });
      }
      throw new HttpException(
        {
          error: payload.error ?? 'VERIFICATION_ERROR',
          message: payload.message ?? 'No se pudo completar la verificación.',
        },
        response.status,
      );
    }
    return payload as T;
  }
}
