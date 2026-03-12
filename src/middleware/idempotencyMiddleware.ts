import { Request, Response, NextFunction } from 'express';

interface CachedResponse {
  status: number;
  body: unknown;
  expiresAt: number;
}

const cache = new Map<string, CachedResponse>();
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/** Evict expired entries periodically */
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (entry.expiresAt < now) cache.delete(key);
  }
}, 60 * 60 * 1000);

/**
 * Idempotency middleware for POST endpoints.
 * If the request includes an `Idempotency-Key` header and a cached response
 * exists for that key, the cached response is returned immediately.
 * Otherwise the request proceeds and the response is cached before sending.
 */
export function idempotencyMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (req.method !== 'POST') return next();

  const key = req.headers['idempotency-key'] as string | undefined;
  if (!key) return next();

  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    res.status(cached.status).json(cached.body);
    return;
  }

  const originalJson = res.json.bind(res);
  res.json = (body: unknown) => {
    if (res.statusCode < 500) {
      cache.set(key, { status: res.statusCode, body, expiresAt: Date.now() + TTL_MS });
    }
    return originalJson(body);
  };

  next();
}
