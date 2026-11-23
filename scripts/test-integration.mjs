import { spawn, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const compose = ['compose', '-f', 'docker-compose.test.yml'];
function run(command, args, env = process.env, quiet = false) {
  const result = spawnSync(command, args, {
    shell: command === 'npm' && process.platform === 'win32',
    cwd: root,
    env,
    stdio: quiet ? 'pipe' : 'inherit',
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    if (quiet) console.error(result.stdout, result.stderr);
    throw new Error(`${command} ${args.join(' ')} failed (${result.status})`);
  }
  return result.stdout;
}
const port = (service, internal) =>
  run(
    'docker',
    [...compose, 'port', service, String(internal)],
    process.env,
    true,
  )
    .trim()
    .split(':')
    .at(-1);
try {
  run('docker', [...compose, 'up', '--build', '-d', '--wait']);
  run('docker', [
    ...compose,
    'exec',
    '-T',
    'verification-python',
    'python',
    '-m',
    'pytest',
    '-q',
  ]);
  const backendEnv = {
    ...process.env,
    NODE_ENV: 'test',
    DB_HOST: '127.0.0.1',
    DB_USER: 'test',
    DB_PASSWORD: 'test-local-only',
    DB_PORT: port('backend-db', 5432),
    DB_NAME: 'peak_paz_test',
    JWT_SECRET: randomBytes(32).toString('hex'),
    SEED_ADMIN_EMAIL: 'admin@example.com',
    SEED_ADMIN_PASSWORD: randomBytes(16).toString('hex'),
    PAYMENT_DRIVER: 'fake',
    RABBITMQ_URL: `amqp://test:test-local-only@127.0.0.1:${port('rabbitmq', 5672)}`,
    DOCUMENT_BASE_URL: 'http://host.docker.internal:3099',
    MAILPIT_TEST_URL: `http://127.0.0.1:${port('mailpit', 8025)}`,
    SMTP_URL: `smtp://127.0.0.1:${port('mailpit', 1025)}`,
  };
  run('npm', ['run', 'migration:run', '--prefix', 'backend'], backendEnv, true);
  run('npm', ['run', 'seed', '--prefix', 'backend'], backendEnv, true);
  await new Promise((resolve, reject) => {
    const child = spawn('npm', ['run', 'test:e2e'], {
      shell: process.platform === 'win32',
      cwd: `${root}/backend`,
      env: backendEnv,
      stdio: 'inherit',
    });
    child.on('error', reject);
    child.on('exit', (code) =>
      code === 0 ? resolve() : reject(new Error('backend test:e2e failed')),
    );
  });
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  run('docker', [...compose, 'down', '--volumes']);
}
