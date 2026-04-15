/**
 * Express middleware configuration.
 *
 * Extracted from src/index.ts — configures body parsing, rate limiting, CORS,
 * request logging, security headers, and static file / Vite dev serving.
 */
import fs from 'fs';
import path from 'path';
import express, { type NextFunction, type Request, type Response } from 'express';
import { applyRateLimiting } from '@src/middleware/rateLimiter';
import { maintenanceModeMiddleware } from '@src/middleware/maintenanceMiddleware';
import Logger from '@common/logger';

const appLogger = Logger.withContext('app:index');
const httpLogger = Logger.withContext('http');

export interface MiddlewareContext {
  frontendDistPath: string;
  frontendAssetsPath: string;
  /** Mutable ref so Vite dev server can be assigned later and used by middleware. */
  viteServerRef: { current: any };
}

export function setupMiddleware(app: express.Application, ctx: MiddlewareContext): void {
  const { frontendDistPath, frontendAssetsPath, viteServerRef } = ctx;

  // Body parsing
  app.use(
    express.json({
      verify: (req: any, _res, buf) => {
        req.rawBody = buf.toString();
      },
    })
  );
  app.use(express.urlencoded({ extended: true }));

  // Rate limiting middleware
  app.use(applyRateLimiting);

  // Maintenance mode middleware - check if system is in maintenance mode
  app.use(maintenanceModeMiddleware);

  // CORS middleware for localhost development
  app.use((req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;
    const isLocalhost =
      origin?.includes('localhost') ||
      origin?.includes('127.0.0.1') ||
      req.hostname === 'localhost' ||
      req.hostname === '127.0.0.1';

    if (isLocalhost) {
      res.setHeader('Access-Control-Allow-Origin', origin || 'http://localhost:3000');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, X-CSRF-Token'
      );

      // Handle preflight requests
      if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
      }
    }

    next();
  });

  // Request logging & security headers
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Suppress noisy health checks by default, but allow override via SUPPRESS_HEALTH_LOGS
    const suppressHealthLogs = process.env.SUPPRESS_HEALTH_LOGS !== 'false';
    if (req.path === '/health' || req.path === '/api/health') {
      if (!suppressHealthLogs) {
        httpLogger.debug('Incoming request', { method: req.method, path: req.path });
      }
    } else {
      httpLogger.debug('Incoming request', { method: req.method, path: req.path });
    }

    // Security headers
    // SECURITY: See src/server/middleware/security.ts for detailed CSP explanation
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const workerSrc =
      process.env.NODE_ENV === 'development' ? "worker-src 'self' blob:;" : "worker-src 'none';";
    res.setHeader(
      'Content-Security-Policy',
      `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; connect-src 'self' ws: wss:; font-src 'self' data: https://fonts.gstatic.com; object-src 'none'; frame-ancestors 'none'; ${workerSrc}`
    );

    next();
  });

  // Serve dashboard at root
  if (process.env.NODE_ENV !== 'development') {
    app.get('/', async (req: Request, res: Response) => {
      const indexPath = path.join(frontendDistPath, 'index.html');
      appLogger.debug('Handling root request for frontend shell', { frontendDistPath, indexPath });

      try {
        await fs.promises.access(indexPath);
        appLogger.debug('Serving frontend index.html');
        res.sendFile(indexPath, (err) => {
          if (err) {
            appLogger.error('Error sending frontend file', { error: err });
            res.status(500).send('Error serving frontend');
          } else {
            appLogger.info('Frontend served successfully');
          }
        });
      } catch {
        appLogger.error('Frontend index.html not found', { indexPath });
        res.status(404).send('Frontend not found - please run pnpm run build:frontend');
      }
    });
  }

  // Serve static files from webui dist directory (Production Only)
  if (process.env.NODE_ENV !== 'development') {
    app.use(express.static(frontendDistPath));
    // Global assets static for root-relative asset paths
    app.use('/assets', express.static(frontendAssetsPath));

    // Uber UI (dashboard)
    app.use('/uber', express.static(frontendDistPath));
    app.use('/uber/*', (req: Request, res: Response) => {
      res.sendFile(path.join(frontendDistPath, 'index.html'));
    });
  } else {
    // Development Mode Handlers - Proxy to Vite
    const serveDevHtml = async (req: Request, res: Response) => {
      try {
        const url = req.originalUrl;
        let template = await fs.promises.readFile(
          path.join(process.cwd(), 'src/client/index.html'),
          'utf-8'
        );
        template = await viteServerRef.current.transformIndexHtml(url, template);
        res
          .status(200)
          .set({
            'Content-Type': 'text/html',
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            Pragma: 'no-cache',
            Expires: '0',
          })
          .end(template);
      } catch (e: unknown) {
        if (e instanceof Error) {
          viteServerRef.current.ssrFixStacktrace(e);
        }
        appLogger.error('Vite SSR Error', e);
        res.status(500).end(e instanceof Error ? e.message : String(e));
      }
    };

    app.get('/', serveDevHtml);
    app.get('/login', serveDevHtml);
    app.get('/dashboard', serveDevHtml);
    app.get('/activity', serveDevHtml);
    app.get('/uber/*', serveDevHtml);
    app.get('/admin/*', serveDevHtml);
    app.get('/webui/*', serveDevHtml);
  }
}
