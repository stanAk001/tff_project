// Runs the API (port 4000) and the storefront dev server (port 5173) together.
// Stop both with Ctrl+C.
import { spawn } from 'node:child_process';

const run = (name, cwd) => {
  const child = spawn('npm', ['run', 'dev'], { cwd, shell: true, stdio: ['ignore', 'pipe', 'pipe'] });
  const prefix = (chunk) =>
    chunk
      .toString()
      .split('\n')
      .filter(Boolean)
      .map((line) => `[${name}] ${line}`)
      .join('\n');
  child.stdout.on('data', (chunk) => console.log(prefix(chunk)));
  child.stderr.on('data', (chunk) => console.error(prefix(chunk)));
  child.on('exit', (code) => {
    console.log(`[${name}] stopped (${code ?? 'signal'})`);
    process.exit(code ?? 0);
  });
  return child;
};

const children = [run('api', 'server'), run('web', 'client')];
const stop = () => children.forEach((child) => child.kill());
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
