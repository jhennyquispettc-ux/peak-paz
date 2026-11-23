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
        return [line.slice(0, i), line.slice(i + 1).trim()];
      }),
  );
const secret = () => randomBytes(32).toString('hex');
const keep = (value) =>
  value && !value.startsWith('replace-') ? value : secret();
const files = ['.env', 'backend/.env'].map((path) => resolve(root, path));
const existing = files.map(parse);
const rabbitPassword = keep(existing[0].RABBITMQ_PASSWORD);
const values = [
  { RABBITMQ_PASSWORD: rabbitPassword },
  {
    RABBITMQ_URL: `amqp://peakpaz:${rabbitPassword}@localhost:5672`,
    JWT_SECRET: keep(existing[1].JWT_SECRET),
    SEED_ADMIN_PASSWORD: keep(existing[1].SEED_ADMIN_PASSWORD),
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
      ? content.replace(pattern, () => `${name}=${value}`)
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
