import { spawn, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { createServer } from 'node:net';
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
const freePort = await new Promise((resolve, reject) => {
  const server = createServer();
  server.once('error', reject);
  server.listen(0, '127.0.0.1', () => {
    const { port } = server.address();
    server.close(() => resolve(port));
  });
});
let service;
let serviceLogs = '';
try {
  run('docker', [...compose, 'up', '-d', '--wait']);
  const shared = {
    ...process.env,
    NODE_ENV: 'test',
    DB_HOST: '127.0.0.1',
    DB_USER: 'test',
    DB_PASSWORD: 'test-local-only',
    VERIFICATION_SERVICE_KEY: randomBytes(32).toString('hex'),
  };
  const verificationEnv = {
    ...shared,
    PORT: String(freePort),
    DB_PORT: port('verification-db', 5432),
    DB_NAME: 'verification_test',
    EMAIL_TOKEN_SECRET: randomBytes(32).toString('hex'),
    MAIL_TRANSPORT: 'smtp',
    SMTP_URL: `smtp://127.0.0.1:${port('mailpit', 1025)}`,
  };
  const backendEnv = {
    ...shared,
    DB_PORT: port('backend-db', 5432),
    DB_NAME: 'peak_paz_test',
    JWT_SECRET: randomBytes(32).toString('hex'),
    SEED_ADMIN_EMAIL: 'admin@example.com',
    SEED_ADMIN_PASSWORD: randomBytes(16).toString('hex'),
    PAYMENT_DRIVER: 'fake',
    VERIFICATION_SERVICE_URL: `http://127.0.0.1:${freePort}`,
    MAILPIT_TEST_URL: `http://127.0.0.1:${port('mailpit', 8025)}`,
  };
  run('npm', ['run', 'build', '--prefix', 'verification-service']);
  service = spawn('node', ['dist/main.js'], {
    cwd: `${root}/verification-service`,
    env: verificationEnv,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  for (const stream of [service.stdout, service.stderr])
    stream.on('data', (chunk) => {
      serviceLogs = (serviceLogs + chunk).slice(-16000);
    });
  let ready = false;
  for (let i = 0; i < 150; i++) {
    try {
      ready = (await fetch(`${backendEnv.VERIFICATION_SERVICE_URL}/health`)).ok;
    } catch {}
    if (ready || service.exitCode !== null) break;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  if (!ready)
    throw new Error(`Verification service failed to start:\n${serviceLogs}`);
  run('npm', ['run', 'migration:run', '--prefix', 'backend'], backendEnv, true);
  run('npm', ['run', 'seed', '--prefix', 'backend'], backendEnv, true);
  // Run asynchronously: spawnSync would block the child's stdout reader during the suites.
  for (const [directory, script, env] of [
    [
      'verification-service',
      'test:integration',
      {
        ...verificationEnv,
        TEST_VERIFICATION_URL: backendEnv.VERIFICATION_SERVICE_URL,
        MAILPIT_TEST_URL: backendEnv.MAILPIT_TEST_URL,
      },
    ],
    ['backend', 'test:e2e', backendEnv],
  ]) {
    await new Promise((resolve, reject) => {
      const child = spawn('npm', ['run', script], {
        shell: process.platform === 'win32',
        cwd: `${root}/${directory}`,
        env,
        stdio: 'inherit',
      });
      child.on('error', reject);
      child.on('exit', (code) =>
        code === 0
          ? resolve()
          : reject(new Error(`${directory} ${script} failed`)),
      );
    });
  }
} catch (error) {
  console.error(error.message);
  if (serviceLogs) console.error(serviceLogs);
  process.exitCode = 1;
} finally {
  if (service && service.exitCode === null) {
    service.kill('SIGTERM');
    await new Promise((resolve) => {
      service.once('exit', resolve);
      setTimeout(() => {
        service.kill('SIGKILL');
        resolve();
      }, 5000).unref();
    });
  }
  run('docker', [...compose, 'down', '--volumes']);
}
