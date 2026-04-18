import express from 'express';
import request from 'supertest';
import healthRouter from '../../src/server/routes/health';
import sitemapRouter from '../../src/server/routes/sitemap';
import configRouter from '../../src/server/routes/config';

describe('API Response Consistency', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/health', healthRouter);
    app.use('/', sitemapRouter);
    app.use('/api/config', configRouter);
  });

  const endpoints = [
    { path: '/health', expectedStatus: 200 },
    { path: '/health/detailed', expectedStatus: 200 },
    { path: '/sitemap.json', expectedStatus: 200 },
    { path: '/api/config/llm-status', expectedStatus: 200 },
  ];

  endpoints.forEach(({ path, expectedStatus }) => {
    it(`GET ${path} should return a consistent JSON response`, async () => {
      const res = await request(app).get(path);
      
      expect(res.status).toBe(expectedStatus);
      
      // All successful non-legacy endpoints should ideally have a success flag
      // or at least be valid JSON
      expect(typeof res.body).toBe('object');
      expect(res.body).not.toBeNull();
    });
  });
});
