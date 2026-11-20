import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InternalGuard } from './internal.guard.js';
import { environment } from './config.js';

const key = 'valid-internal-service-key-32-characters';
const guard = new InternalGuard(
  new ConfigService({ VERIFICATION_SERVICE_KEY: key }),
);
const context = (value?: string) =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ headers: { 'x-service-key': value } }),
    }),
  }) as unknown as ExecutionContext;
it('rejects missing and incorrect internal keys', () => {
  expect(() => guard.canActivate(context())).toThrow(UnauthorizedException);
  expect(() => guard.canActivate(context('x'.repeat(key.length)))).toThrow(
    UnauthorizedException,
  );
});
it('accepts the configured internal service identity', () => {
  expect(guard.canActivate(context(key))).toBe(true);
});
it('refuses startup with a short verification secret', () => {
  const result = environment.validate({
    DB_HOST: 'localhost',
    DB_PORT: 5432,
    DB_USER: 'test',
    DB_PASSWORD: 'test',
    DB_NAME: 'test',
    VERIFICATION_SERVICE_KEY: 'short',
    EMAIL_TOKEN_SECRET: key,
  });
  expect(result.error?.message).toContain('VERIFICATION_SERVICE_KEY');
});
