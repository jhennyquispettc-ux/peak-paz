import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';

@Injectable()
export class InternalGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}
  canActivate(context: ExecutionContext): boolean {
    const value = context.switchToHttp().getRequest<Request>().headers[
      'x-service-key'
    ];
    const expected = Buffer.from(
      this.config.getOrThrow<string>('VERIFICATION_SERVICE_KEY'),
    );
    const received = Buffer.from(typeof value === 'string' ? value : '');
    if (
      expected.length !== received.length ||
      !timingSafeEqual(expected, received)
    ) {
      throw new UnauthorizedException('Invalid service credentials');
    }
    return true;
  }
}
