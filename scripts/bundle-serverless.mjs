#!/usr/bin/env node
/**
 * Bundle a serverless entry point with esbuild.
 *
 * Used by scripts/build-netlify.sh and scripts/build-vercel.sh. Bundling at
 * build time is required because the source uses tsconfig path aliases
 * ("@src/", "@hivemind/" -> "packages/<name>/src") that no serverless
 * runtime can resolve on its own.
 *
 * Usage: node scripts/bundle-serverless.mjs <entry> <outfile>
 */
import { build } from 'esbuild';

const [entry, outfile] = process.argv.slice(2);
if (!entry || !outfile) {
  console.error('Usage: node scripts/bundle-serverless.mjs <entry> <outfile>');
  process.exit(1);
}

/**
 * Packages that must stay external to the bundle:
 *  - better-sqlite3: native addon. Netlify's function packager traces and
 *    includes it; the Vercel build copies it into the function directory.
 *    If it is missing at runtime, DatabaseManager degrades gracefully.
 *  - pg-native / optional ws & discord.js accelerators: optional deps that
 *    are not installed; the consumers require() them inside try/catch.
 */
const external = [
  'better-sqlite3',
  'bcrypt',
  'pg-native',
  'bufferutil',
  'utf-8-validate',
  'zlib-sync',
  'erlpack',
  '@discordjs/opus',
  'sodium-native',
  'libsodium-wrappers',
  // Pulled in via optional integrations; not needed for the demo-mode API.
  'puppeteer',
  'sharp',
  'ffmpeg-static',
  // Uses deep requires into undici internals that esbuild cannot resolve.
  'jsdom',
];

try {
  const result = await build({
    entryPoints: [entry],
    outfile,
    bundle: true,
    platform: 'node',
    target: 'node22',
    format: 'cjs',
    sourcemap: false,
    minify: false,
    keepNames: true,
    tsconfig: 'tsconfig.json',
    external,
    logLevel: 'warning',
    // Some transitive deps ship .node references or HTML fixtures; treat
    // unknown asset types as files copied next to the bundle.
    loader: {
      '.node': 'copy',
      '.html': 'text',
      '.md': 'text',
    },
    define: {
      'process.env.SERVERLESS': '"true"',
    },
  });
  if (result.warnings.length > 0) {
    console.warn(`esbuild completed with ${result.warnings.length} warning(s)`);
  }
  console.log(`Bundled ${entry} -> ${outfile}`);
} catch (error) {
  console.error('esbuild bundling failed');
  console.error(error?.message || error);
  process.exit(1);
}
