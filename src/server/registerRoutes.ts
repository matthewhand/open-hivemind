/**
 * Express route registration.
 *
 * Extracted from src/index.ts — mounts all API routers, health endpoints,
 * IP filtering, CSRF, catch-all handlers, and the 404 fallback.
 */
import fs from 'fs';
import path from 'path';
import { type NextFunction, type Request, type Response } from 'express';
import swarmRouter from '@src/admin/swarmRoutes';
import { authenticateToken } from '@src/server/middleware/auth';
import { csrfTokenHandler } from '@src/server/middleware/csrf';
import { ipWhitelist } from '@src/server/middleware/security';
import activityRouter from '@src/server/routes/activity';
import adminApiRouter from '@src/server/routes/admin';
import agentsRouter from '@src/server/routes/agents';
import anomalyRouter from '@src/server/routes/anomaly';
import apiDocsRouter from '@src/server/routes/apiDocs';
import authRouter from '@src/server/routes/auth';
import botConfigRouter from '@src/server/routes/botConfig';
import botsRouter from '@src/server/routes/bots';
import ciRouter from '@src/server/routes/ci';
import webuiConfigRouter from '@src/server/routes/config';
import dashboardRouter from '@src/server/routes/dashboard';
import demoRouter from '@src/server/routes/demo';
import enterpriseRouter from '@src/server/routes/enterprise';
import errorsRouter from '@src/server/routes/errors';
import guardsRouter from '@src/server/routes/guards';
import hotReloadRouter from '@src/server/routes/hotReload';
import importExportRouter from '@src/server/routes/importExport';
import integrationsRouter from '@src/server/routes/integrations';
import lettaRouter from '@src/server/routes/letta';
import marketplaceRouter from '@src/server/routes/marketplace';
import mcpRouter from '@src/server/routes/mcp';
import mcpToolsRouter from '@src/server/routes/mcpTools';
import onboardingRouter from '@src/server/routes/onboarding';
import openapiRouter from '@src/server/routes/openapi';
import personasRouter from '@src/server/routes/personas';
import pluginSecurityRouter from '@src/server/routes/pluginSecurity';
import secureConfigRouter from '@src/server/routes/secureConfig';
import sitemapRouter from '@src/server/routes/sitemap';
import specsRouter from '@src/server/routes/specs';
import templatesRouter from '@src/server/routes/templates';
import usageTrackingRouter from '@src/server/routes/usageTracking';
import validationRouter from '@src/server/routes/validation';
import webhooksRouter from '@src/server/routes/webhooks';
import webuiRouter from '@src/server/routes/webui';
import * as healthRouteModule from './routes/health';
import Logger from '@common/logger';

const appLogger = Logger.withContext('app:index');
const httpLogger = Logger.withContext('http');

const healthRoute = (healthRouteModule.default || healthRouteModule) as import('express').Router;

export interface RouteContext {
  frontendDistPath: string;
  /** Mutable ref so Vite dev server can be assigned later and used by route handlers. */
  viteServerRef: { current: any };
}

export function registerRoutes(app: import('express').Application, ctx: RouteContext): void {
  const { frontendDistPath, viteServerRef } = ctx;

  // ─────────────────────────────────────────────────────────────────────────────
  // IP Filtering Security (when auth is disabled)
  // Evaluated lazily per-request so --env-file / dotenv values are available
  // ─────────────────────────────────────────────────────────────────────────────
  let ipFilterLogged = false;
  app.use('/api', (req: Request, res: Response, next: NextFunction) => {
    const allowAll = process.env.HTTP_ALLOW_ALL_IPS === 'true';
    if (!ipFilterLogged) {
      ipFilterLogged = true;
      if (allowAll) {
        appLogger.warn('\u26a0\ufe0f  IP filtering DISABLED (HTTP_ALLOW_ALL_IPS=true)');
      } else {
        appLogger.info(
          '\ud83d\udd12 IP filtering ENABLED for /api/* routes (set HTTP_ALLOW_ALL_IPS=true to disable)'
        );
      }
    }
    if (allowAll) return next();
    return ipWhitelist(req, res, next);
  });

  // CSRF token endpoint
  app.get('/api/csrf-token', csrfTokenHandler);

  // ─────────────────────────────────────────────────────────────────────────────
  // API Route Registration
  // ─────────────────────────────────────────────────────────────────────────────
  // Ordering matters. Express evaluates routers in the order they are mounted.
  // A router mounted at a broader prefix (e.g. '/api') will intercept ALL
  // sub-paths before narrower ones get a chance — if it does not handle the
  // request it must call next(), but relying on that is fragile.
  //
  // Rules:
  //   1. Auth routes first — the CSRF/token endpoint must always be reachable.
  //   2. Protected routes — routes that require authenticateToken middleware.
  //   3. Resource routers — each mounted at its own specific '/api/<resource>'.
  //      These never conflict because they only handle their own sub-paths.
  //   4. Catch-all '/api' router LAST — openapiRouter serves /api/openapi*
  //      and acts as a documentation endpoint. If placed earlier it would
  //      swallow requests meant for routers below it.
  // ─────────────────────────────────────────────────────────────────────────────

  // 1. Auth & error handling (no token required)
  app.use('/api/auth', authRouter);
  app.use('/api/errors', errorsRouter);

  // 2. Protected routes (authenticateToken required)
  app.use('/api/swarm', authenticateToken, swarmRouter);
  app.use('/api/anomalies', authenticateToken, anomalyRouter);
  app.use('/api/guards', authenticateToken, guardsRouter);
  app.use('/api/specs', authenticateToken, specsRouter);
  app.use('/api/import-export', authenticateToken, importExportRouter);

  // 3. Resource routers (specific paths, no catch-all conflict)
  app.use('/api/activity', activityRouter);
  app.use('/api/agents', agentsRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/config', webuiConfigRouter);
  app.use('/api/bots', botsRouter);
  app.use('/api/bot-config', botConfigRouter);
  app.use('/api/validation', validationRouter);
  app.use('/api/hot-reload', hotReloadRouter);
  app.use('/api/ci', ciRouter);
  app.use('/api/enterprise', enterpriseRouter);
  app.use('/api/secure-config', secureConfigRouter);
  app.use('/api/admin', adminApiRouter);
  app.use('/api/integrations', integrationsRouter);
  app.use('/api/letta', lettaRouter);
  app.use('/api/marketplace', marketplaceRouter);
  app.use('/api/mcp', mcpRouter);
  app.use('/api/mcp-tools', mcpToolsRouter);
  app.use('/api/onboarding', onboardingRouter);
  app.use('/api/personas', personasRouter);
  app.use('/api/templates', templatesRouter);
  app.use('/api/usage-tracking', usageTrackingRouter);
  app.use('/api/webhooks', webhooksRouter);
  app.use('/api/webui', webuiRouter);
  app.use('/api/demo', demoRouter);
  app.use('/api/docs', apiDocsRouter);
  app.use('/api/pluginSecurity', pluginSecurityRouter);

  // 4. Catch-all '/api' router — MUST be last
  //    openapiRouter handles /api/openapi, /api/openapi.json, etc.
  //    If mounted earlier it would intercept ALL /api/* requests.
  app.use('/api', openapiRouter);

  // Health endpoints
  app.use('/api/health', healthRoute);
  app.use('/health', healthRoute);

  app.use(sitemapRouter); // Sitemap routes at root level

  // Legacy route redirects - everything now under /
  app.use('/webui', (req: Request, res: Response) => res.redirect(301, '/' + req.path));
  app.get('/admin*', (req: Request, res: Response) => {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });

  // React Router catch-all handler (must be AFTER all API routes)
  // Serve index.html for all non-API, non-asset routes so React Router handles them
  app.get('*', (req: Request, res: Response, next: NextFunction) => {
    // Skip API routes, static assets, and Vite internal paths
    if (
      req.path.startsWith('/api') ||
      req.path.startsWith('/health') ||
      req.path.startsWith('/@') || // Vite internals: /@react-refresh, /@vite/client, /@fs/
      req.path.startsWith('/node_modules') || // Vite serves node_modules in dev
      req.path.startsWith('/src/') || // Vite serves source files in dev
      req.path.includes('.') // Static assets with file extensions
    ) {
      return next();
    }
    if (process.env.NODE_ENV === 'development' && viteServerRef.current) {
      // In dev mode, serve through Vite's HTML transform
      const url = req.originalUrl;
      fs.promises
        .readFile(path.join(process.cwd(), 'src/client/index.html'), 'utf-8')
        .then((template) => viteServerRef.current.transformIndexHtml(url, template))
        .then((html) => {
          res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
        })
        .catch((e: unknown) => {
          if (e instanceof Error) viteServerRef.current.ssrFixStacktrace(e);
          next(e);
        });
    } else {
      res.sendFile(path.join(frontendDistPath, 'index.html'));
    }
  });

  // Vite Proxy Middleware for Development (Must be before 404 handler)
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (process.env.NODE_ENV === 'development' && viteServerRef.current) {
      viteServerRef.current.middlewares(req, res, next);
    } else {
      next();
    }
  });

  // Return 404 for all non-existent routes (all HTTP methods)
  app.all('*', (req: Request, res: Response) => {
    // Skip API routes — these should have been matched by earlier routers
    if (req.path.startsWith('/api') || req.path.startsWith('/health')) {
      httpLogger.debug('Unmatched API route', { path: req.path, method: req.method });
      return res
        .status(404)
        .json({ error: 'Endpoint not found', path: req.path, method: req.method });
    }
    httpLogger.debug('No matching route for request', { path: req.path });
    return res.status(404).json({ error: 'Endpoint not found' });
  });
}
