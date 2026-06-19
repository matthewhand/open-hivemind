/**
 * Netlify Functions entry point.
 *
 * Wraps the real Express app (see src/server/serverlessApp.ts) with
 * serverless-http. netlify.toml routes /api/* and /health here; the built
 * WebUI is published to the CDN and served directly.
 *
 * This file is pre-bundled by scripts/build-netlify.sh (esbuild) into
 * dist/netlify/functions/server.js so that tsconfig path aliases and
 * TypeScript are resolved at build time.
 */
import serverless from 'serverless-http';
import { getServerlessApp } from '../../server/serverlessApp';

type ServerlessHandler = (event: unknown, context: unknown) => Promise<unknown>;

let cachedHandler: ServerlessHandler | null = null;

export const handler = async (event: unknown, context: unknown): Promise<unknown> => {
  if (!cachedHandler) {
    const app = await getServerlessApp();
    cachedHandler = serverless(app) as ServerlessHandler;
  }
  return cachedHandler(event, context);
};
