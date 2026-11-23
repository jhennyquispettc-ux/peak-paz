import { envValidation } from './env.validation.js';

const base = {
  DB_HOST: 'localhost',
  DB_PORT: 5432,
  DB_USER: 'user',
  DB_PASSWORD: 'password',
  DB_NAME: 'name',
  JWT_SECRET: 'a'.repeat(32),
  SEED_ADMIN_EMAIL: 'admin@example.com',
  SEED_ADMIN_PASSWORD: 'password123',
};
const production = {
  ...base,
  NODE_ENV: 'production',
  RABBITMQ_URL: 'amqps://user:key@broker.example.com/vhost',
  DOCUMENT_BASE_URL: 'https://api.example.com',
  SMTP_URL: 'smtp://user:key@mail.example.com:2525',
  PUBLIC_WEB_URL: 'https://web.example.com',
};
const check = (values: object) =>
  envValidation.validate(values, { allowUnknown: true });

describe('envValidation', () => {
  it('keeps local defaults outside production', () => {
    const { error, value } = check(base);
    expect(error).toBeUndefined();
    expect(value.PUBLIC_WEB_URL).toBe('http://localhost:5173');
  });

  it('accepts a complete production configuration', () => {
    expect(check(production).error).toBeUndefined();
  });

  it.each([
    'RABBITMQ_URL',
    'DOCUMENT_BASE_URL',
    'SMTP_URL',
    'PUBLIC_WEB_URL',
  ] as const)('requires %s in production', (name) => {
    const { [name]: _removed, ...incomplete } = production;
    expect(check(incomplete).error?.message).toContain(name);
    expect(check({ ...production, [name]: '' }).error).toBeDefined();
  });
});
