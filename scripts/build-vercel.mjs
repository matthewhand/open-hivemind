#!/usr/bin/env node
/**
 * Vercel build (Build Output API v3).
 *
 * Produces .vercel/output/ so Vercel deploys deterministically without
 * scanning an api/ directory:
 *   - static/            built WebUI (vite output, run build:frontend first)
 *   - functions/api.func a single Node function wrapping the real Express
 *                        app in stateless demo mode (src/vercel/index.ts)
 *   - config.json        routing: /api/* and /health -> the function,
 *                        static assets from the CDN, SPA fallback otherwise
 *
 * Native/external packages (better-sqlite3, bcrypt, ...) are kept out of the
 * esbuild bundle, so this script traces the bundle with @vercel/nft and
 * copies the required node_modules files into the function directory.
 */
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { nodeFileTrace } from '@vercel/nft';

const root = process.cwd();
const outputDir = path.join(root, '.vercel/output');
const staticDir = path.join(outputDir, 'static');
const funcDir = path.join(outputDir, 'functions/api.func');
const clientDist = path.join(root, 'src/client/dist');

// ── Preconditions ────────────────────────────────────────────────────────────
if (!fs.existsSync(path.join(clientDist, 'index.html'))) {
  console.error('ERROR: src/client/dist/index.html missing — run `pnpm run build:frontend` first.');
  process.exit(1);
}

fs.rmSync(outputDir, { recursive: true, force: true });
fs.mkdirSync(funcDir, { recursive: true });

// ── Static WebUI ─────────────────────────────────────────────────────────────
console.log('==> Copying WebUI to .vercel/output/static');
fs.cpSync(clientDist, staticDir, { recursive: true });

// ── Function bundle ──────────────────────────────────────────────────────────
console.log('==> Bundling Vercel function (.vercel/output/functions/api.func/index.js)');
execFileSync(
  process.execPath,
  ['scripts/bundle-serverless.mjs', 'src/vercel/index.ts', path.join(funcDir, 'index.js')],
  { stdio: 'inherit' }
);

// ── Trace external node_modules into the function directory ─────────────────
console.log('==> Tracing external dependencies with @vercel/nft');
const { fileList, warnings } = await nodeFileTrace([path.join(funcDir, 'index.js')], {
  base: root,
});
for (const warning of warnings) {
  // Unresolved optional requires (pg-native, bufferutil, ...) are expected.
  if (process.env.DEBUG) console.warn('nft:', warning.message);
}

let copied = 0;
for (const file of fileList) {
  if (!file.startsWith('node_modules/')) continue; // bundle itself, etc.
  const src = path.join(root, file);
  const dest = path.join(funcDir, file);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const stat = fs.lstatSync(src);
  if (stat.isSymbolicLink()) {
    const target = fs.readlinkSync(src);
    try {
      fs.symlinkSync(target, dest);
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
    }
  } else if (stat.isFile()) {
    fs.copyFileSync(src, dest);
  }
  copied += 1;
}
console.log(`==> Copied ${copied} traced node_modules entries into api.func`);

// ── Function config ──────────────────────────────────────────────────────────
fs.writeFileSync(
  path.join(funcDir, '.vc-config.json'),
  JSON.stringify(
    {
      runtime: 'nodejs22.x',
      handler: 'index.js',
      launcherType: 'Nodejs',
      shouldAddHelpers: false,
      maxDuration: 30,
      memory: 1024,
    },
    null,
    2
  )
);

// ── Routing config ───────────────────────────────────────────────────────────
fs.writeFileSync(
  path.join(outputDir, 'config.json'),
  JSON.stringify(
    {
      version: 3,
      routes: [
        // Immutable cache for hashed vite assets.
        {
          src: '^/assets/(.*)$',
          headers: { 'cache-control': 'public, max-age=31536000, immutable' },
          continue: true,
        },
        // Serve real files (the built SPA) first.
        { handle: 'filesystem' },
        // API + health go to the Express function.
        { src: '^/api(?:/.*)?$', dest: '/api' },
        { src: '^/health/?$', dest: '/api' },
        // Everything else falls back to the SPA shell.
        { src: '^/(?!api(?:/|$)).*$', dest: '/index.html' },
      ],
    },
    null,
    2
  )
);

console.log('==> Vercel build complete (.vercel/output)');
