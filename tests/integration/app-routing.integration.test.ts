import request from 'supertest';
import { WebUIServer } from '../../src/server/server';
import express from 'express';

// We may need to mock registerServices to prevent missing dependency errors.
import { registerServices } from '../../src/di/registration';

describe('App Routing Integration', () => {
  let app: express.Application;

  beforeAll(() => {
    registerServices();
    // Build real express app
    const server = new WebUIServer();
    app = server.getApp();
  });

  it('should allow public access to health and sitemap routes', async () => {
    // Health Check is public
    const resHealth = await request(app).get('/health');
    expect(resHealth.status).toBe(200);

    // Sitemap JSON is public
    const resSitemap = await request(app).get('/sitemap.json');
    expect(resSitemap.status).toBe(200);
  });

  it('should return 401 Unauthorized for protected API routes', async () => {
    // /api/health is now public (optionalAuth), but other /api/admin routes are not
    const resHealth = await request(app).get('/api/health');
    expect(resHealth.status).toBe(200);

    // /api/agents is protected
    const resAgents = await request(app).get('/api/agents');
    expect(resAgents.status).toBe(401);

    // /api/config is protected
    const resConfig = await request(app).get('/api/config');
    expect(resConfig.status).toBe(401);
  });

  it('should return 404 for entirely unknown API routes', async () => {
    // API 404 middleware
    const resUnknown = await request(app).get('/api/does-not-exist');
    expect(resUnknown.status).toBe(404);
    expect(resUnknown.body.error).toBe('Not Found');
  });

  it('should serve HTML index for frontend routes', async () => {
    // /admin/* fallback
    const resWebUI = await request(app).get('/admin/some-frontend-path');
    
    // We just check if it doesn't give a raw Express 404 HTML but returns the index.html or 404
    // Usually res.text will be index.html or if missing dist, a string
    expect(resWebUI.status).toBe(200);
    expect(resWebUI.headers['content-type']).toMatch(/html/);
  });
});
