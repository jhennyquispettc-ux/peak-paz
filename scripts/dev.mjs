import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const windows = process.platform === 'win32';

for (const [command, args] of [
  ['node', ['scripts/setup-local.mjs']],
  ['docker', ['compose', 'up', '--build', '-d', '--wait']],
  ['npm', ['run', 'migration:run', '--prefix', 'backend']],
  ['npm', ['run', 'seed', '--prefix', 'backend']],
]) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    shell: windows && command === 'npm',
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
const children = ['backend', 'frontend'].map((directory) =>
  spawn('npm', ['run', directory === 'backend' ? 'start:dev' : 'dev'], {
    cwd: `${root}/${directory}`,
    stdio: 'inherit',
    detached: !windows,
    shell: windows,
  }),
);
function kill(child) {
  if (child.exitCode !== null) return;
  if (windows) {
    spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
      stdio: 'ignore',
    });
    return;
  }
  try {
    process.kill(-child.pid, 'SIGTERM');
  } catch {}
}
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) kill(child);
  process.exitCode = code;
}
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => stop());
for (const child of children) child.on('exit', (code) => stop(code ?? 0));
console.log('Web: http://localhost:5173 · Buzón local: http://localhost:8025');
