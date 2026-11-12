// Builds SeedSphere for Vercel as ONE deployment: the Vite frontend as static
// files and the Express API (server/) as a single Node serverless function,
// using Vercel's Build Output API (https://vercel.com/docs/build-output-api).
//
//   /api/v1/*  -> the Express app (server/src/serverless.ts)
//   /assets/*  -> static files
//   anything else -> index.html (client-side routing)
//
// Because the API is served from the same origin, the frontend calls
// /api/v1 directly: no CORS, no second hosting provider.
//
// Run locally with:  npm run build:vercel

import { execSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, '.vercel', 'output');
const fnDir = join(out, 'functions', 'api.func');

rmSync(out, { recursive: true, force: true });
mkdirSync(fnDir, { recursive: true });

// 1. Frontend. Same-origin API unless the project overrides it.
process.env.VITE_API_BASE_URL ??= '/api/v1';
console.log(`[build] frontend (VITE_API_BASE_URL=${process.env.VITE_API_BASE_URL})`);
execSync('npx tsc && npx vite build', { cwd: root, stdio: 'inherit', env: process.env });
cpSync(join(root, 'dist'), join(out, 'static'), { recursive: true });

// 2. API function: bundle the Express app and its dependencies into one file.
if (!existsSync(join(root, 'server', 'node_modules'))) {
  console.log('[build] installing server dependencies');
  execSync('npm ci --no-audit --no-fund', { cwd: join(root, 'server'), stdio: 'inherit' });
}
console.log('[build] api function');
await build({
  entryPoints: [join(root, 'server', 'src', 'serverless.ts')],
  outfile: join(fnDir, 'index.mjs'),
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  // pg tries to load the optional native binding; it is never installed.
  external: ['pg-native'],
  // CommonJS dependencies (express, pg) call require() on Node built-ins.
  banner: { js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);" },
  logLevel: 'warning',
});
writeFileSync(
  join(fnDir, '.vc-config.json'),
  JSON.stringify({ runtime: 'nodejs20.x', handler: 'index.mjs', launcherType: 'Nodejs', maxDuration: 60 }, null, 2),
);

// 3. Routing.
writeFileSync(
  join(out, 'config.json'),
  JSON.stringify(
    {
      version: 3,
      routes: [
        { src: '^/api/(.*)$', dest: '/api' },
        { handle: 'filesystem' },
        { src: '^/(.*)$', dest: '/index.html' },
      ],
    },
    null,
    2,
  ),
);

console.log('[build] done -> .vercel/output');
