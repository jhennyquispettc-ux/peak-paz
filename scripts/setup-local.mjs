import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const parse = (path) =>
  Object.fromEntries(
    (existsSync(path) ? readFileSync(path, 'utf8') : '')
      .split('\n')
      .filter((line) => /^[A-Z_]+=/.test(line))
      .map((line) => {
        const i = line.indexOf('=');
        return [line.slice(0, i), line.slice(i + 1)];
      }),
  );
const secret = () => randomBytes(32).toString('hex');
const files = ['.env', 'backend/.env', 'verification-service/.env'].map(
  (path) => resolve(root, path),
);
const existing = files.map(parse);
const configuredKeys = new Set(
  existing
    .map((env) => env.VERIFICATION_SERVICE_KEY)
    .filter((value) => value && !value.startsWith('replace-')),
);
if (configuredKeys.size > 1)
  throw new Error(
    'Las claves VERIFICATION_SERVICE_KEY existentes no coinciden. Corrige los .env antes de continuar.',
  );
const key = [...configuredKeys][0] ?? secret();
const password =
  [existing[0].VERIFICATION_DB_PASSWORD, existing[2].DB_PASSWORD].find(
    (value) => value && !value.startsWith('replace-'),
  ) ?? secret();
const values = [
  { VERIFICATION_SERVICE_KEY: key, VERIFICATION_DB_PASSWORD: password },
  {
    VERIFICATION_SERVICE_KEY: key,
    JWT_SECRET:
      existing[1].JWT_SECRET && !existing[1].JWT_SECRET.startsWith('replace-')
        ? existing[1].JWT_SECRET
        : secret(),
    SEED_ADMIN_PASSWORD:
      existing[1].SEED_ADMIN_PASSWORD &&
      !existing[1].SEED_ADMIN_PASSWORD.startsWith('replace-')
        ? existing[1].SEED_ADMIN_PASSWORD
        : secret(),
  },
  {
    VERIFICATION_SERVICE_KEY: key,
    DB_PASSWORD: password,
    EMAIL_TOKEN_SECRET:
      existing[2].EMAIL_TOKEN_SECRET &&
      !existing[2].EMAIL_TOKEN_SECRET.startsWith('replace-')
        ? existing[2].EMAIL_TOKEN_SECRET
        : secret(),
  },
];
files.forEach((file, index) => {
  const original = existsSync(file)
    ? readFileSync(file, 'utf8')
    : readFileSync(`${file}.example`, 'utf8');
  let content = original;
  for (const [name, value] of Object.entries(values[index])) {
    const pattern = new RegExp(`^${name}=.*$`, 'm');
    content = pattern.test(content)
      ? content.replace(pattern, `${name}=${value}`)
      : `${content}\n${name}=${value}\n`;
  }
  writeFileSync(file, content, { mode: 0o600 });
});
console.log(
  'Configuración local lista. Las claves están en los .env ignorados por Git.',
);
console.log(
  'La contraseña del administrador está en backend/.env (SEED_ADMIN_PASSWORD).',
);
