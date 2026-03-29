import request from 'supertest';
import express, { Express } from 'express';

// Need to completely bypass the original require cache because rateLimiter is initialized on module load
// with the current environment variables.
describe('Rate Limiter Coverage', () => {
  let app: Express;

  beforeAll(() => {
    // Reset env vars and cache to ensure rate limiter gets created with "production" mode
    jest.resetModules();
    process.env.NODE_ENV = 'production';
    process.env.DISABLE_RATE_LIMIT = 'false';
    process.env.RATE_LIMIT_CONFIG_MAX = '2';
    process.env.RATE_LIMIT_CONFIG_WINDOW_MS = '60000';

    const { configRateLimiter } = require('../../src/middleware/rateLimiter');

    app = express();
    app.use(express.json());

    app.set('trust proxy', true);

    const configRouter = require('../../src/server/routes/config').default;
    const botConfigRouter = require('../../src/server/routes/botConfig').default;
    const mcpRouter = require('../../src/server/routes/mcp').default;
    const importExportRouter = require('../../src/server/routes/importExport').default;
    const marketplaceRouter = require('../../src/server/routes/marketplace').default;
    const personasRouter = require('../../src/server/routes/personas').default;
    const specsRouter = require('../../src/server/routes/specs').default;
    const integrationsRouter = require('../../src/server/routes/integrations').default;

    // Mount routes
    app.use('/api/config', configRouter);
    app.use('/api/bot-config', botConfigRouter);
    app.use('/api/mcp', mcpRouter);
    app.use('/api/import-export', importExportRouter);
    app.use('/api/marketplace', marketplaceRouter);
    app.use('/api/personas', personasRouter);
    app.use('/api/specs', specsRouter);
    app.use('/api/integrations', integrationsRouter);
  });

  const endpoints = [
    { method: 'post', path: '/api/config/llm-profiles' },
    { method: 'put', path: '/api/config/llm-profiles/test' },
    { method: 'post', path: '/api/bot-config/instances/test/start' },
    { method: 'post', path: '/api/mcp/servers' },
    { method: 'post', path: '/api/import-export/export' },
    { method: 'post', path: '/api/marketplace/install' },
    { method: 'post', path: '/api/personas' },
    { method: 'post', path: '/api/specs' },
    { method: 'post', path: '/api/integrations' }
  ];

  for (const endpoint of endpoints) {
    it(`should apply rate limit to ${endpoint.method.toUpperCase()} ${endpoint.path}`, async () => {
      // Create a unique IP for each endpoint to avoid cross-test limiting
      const ip = Math.floor(Math.random() * 255) + '.' + Math.floor(Math.random() * 255) + '.1.1';

      let limitReached = false;
      let statusCode = 200;

      for (let i = 0; i < 5; i++) {
        const res = await request(app)
          [endpoint.method as 'post' | 'put' | 'delete' | 'patch'](endpoint.path)
          .set('X-Forwarded-For', ip)
          .send({});

        if (res.status === 429) {
          limitReached = true;
          statusCode = res.status;
          break;
        }
      }

      expect(limitReached).toBe(true);
      expect(statusCode).toBe(429);
    });
  }
});
