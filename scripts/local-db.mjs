// Optional: starts a private PostgreSQL database for development in ./.pgdata
// (port 5433, user "tff", database "tff", no password — local connections only).
// Uses the PostgreSQL that is already installed; creates the database on first run.
//
// You don't need this if you'd rather use your own PostgreSQL server (and manage
// it in pgAdmin) — just point DATABASE_URL in server/.env at it instead.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const DATA = path.resolve('.pgdata');
const PORT = '5433';

const findBin = () => {
  if (process.env.PG_BIN) return process.env.PG_BIN;
  const roots = ['C:/Program Files/PostgreSQL', '/usr/lib/postgresql', '/opt/homebrew/opt', '/usr/local/opt'];
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    const versions = fs.readdirSync(root).filter((name) => /\d/.test(name)).sort((a, b) => parseFloat(b.replace(/\D+/, '')) - parseFloat(a.replace(/\D+/, '')));
    for (const version of versions) {
      const bin = path.join(root, version, 'bin');
      if (fs.existsSync(path.join(bin, process.platform === 'win32' ? 'pg_ctl.exe' : 'pg_ctl'))) return bin;
    }
  }
  return ''; // fall back to whatever is on PATH
};

const bin = findBin();
const tool = (name) => (bin ? path.join(bin, name) : name);
const run = (name, args, options = {}) => execFileSync(tool(name), args, { stdio: 'inherit', ...options });

if (!fs.existsSync(path.join(DATA, 'PG_VERSION'))) {
  console.log('Creating a new development database cluster in .pgdata …');
  run('initdb', ['-D', DATA, '-U', 'tff', '-A', 'trust', '-E', 'UTF8', '--locale=C']);
}

let running = false;
try {
  execFileSync(tool('pg_ctl'), ['-D', DATA, 'status'], { stdio: 'ignore' });
  running = true;
} catch {
  running = false;
}

if (!running) {
  run('pg_ctl', ['-D', DATA, '-o', `-p ${PORT} -c listen_addresses=localhost`, '-l', path.join(DATA, 'server.log'), '-w', 'start']);
}

try {
  execFileSync(tool('createdb'), ['-h', 'localhost', '-p', PORT, '-U', 'tff', 'tff'], { stdio: 'ignore' });
  console.log('Created database "tff".');
} catch {
  // already exists
}

console.log(`\nDevelopment database ready:\n  DATABASE_URL=postgresql://tff@localhost:${PORT}/tff?schema=public`);
console.log(`\nIn pgAdmin: Register → Server → Host "localhost", Port ${PORT}, Username "tff", no password.`);
console.log(`To stop it: "${tool('pg_ctl')}" -D .pgdata stop`);
