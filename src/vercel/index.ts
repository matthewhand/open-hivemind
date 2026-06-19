/**
 * Vercel function entry point.
 *
 * Exposes the real Express app (see src/server/serverlessApp.ts) as a plain
 * Node request handler. scripts/build-vercel.sh bundles this file with
 * esbuild into .vercel/output/functions/api.func/index.js (Build Output API
 * v3); routing in .vercel/output/config.json sends /api/* and /health here
 * while the built WebUI is served statically.
 */
import type { IncomingMessage, ServerResponse } from 'http';
import { getServerlessApp } from '../server/serverlessApp';

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const app = await getServerlessApp();

  // An Express app is itself a Node request listener.
  (app as unknown as (req: IncomingMessage, res: ServerResponse) => void)(req, res);

  // Keep the function alive until the response actually finishes.
  await new Promise<void>((resolve) => {
    if (res.writableEnded) return resolve();
    res.on('finish', () => resolve());
    res.on('close', () => resolve());
  });
}
