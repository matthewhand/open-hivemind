import request from 'supertest';
import express from 'express';
import sitemapRouter from '../../src/server/routes/sitemap';

describe('Sitemap Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use('/', sitemapRouter);
  });

  it('should return sitemap.json with correct /admin paths', async () => {
    const res = await request(app).get('/sitemap.json');
    expect(res.status).toBe(200);
    expect(res.body.urls).toBeDefined();

    // Check for existence of /admin paths
    const adminUrl = res.body.urls.find((u: any) => u.url === '/admin/bots');
    expect(adminUrl).toBeDefined();
    expect(adminUrl.access).toBe('authenticated');

    // Check for absence of /uber paths
    const uberUrl = res.body.urls.find((u: any) => u.url.startsWith('/uber'));
    expect(uberUrl).toBeUndefined();
  });

  it('should include new routes like /admin/ai/dashboard', async () => {
    const res = await request(app).get('/sitemap.json');
    const aiUrl = res.body.urls.find((u: any) => u.url === '/admin/ai/dashboard');
    expect(aiUrl).toBeDefined();
    expect(aiUrl.access).toBe('authenticated');
  });

  it('should include monitoring and config routes', async () => {
    const res = await request(app).get('/sitemap.json');
    expect(res.body.urls.find((u: any) => u.url === '/admin/monitoring-dashboard')).toBeDefined();
    expect(res.body.urls.find((u: any) => u.url === '/admin/configuration')).toBeDefined();
  });

  it('should filter by access level', async () => {
    const resPublic = await request(app).get('/sitemap.json?access=public');
    expect(resPublic.body.urls.every((u: any) => u.access === 'public')).toBe(true);
    expect(resPublic.body.urls.find((u: any) => u.url === '/login')).toBeDefined();
    expect(resPublic.body.urls.find((u: any) => u.url === '/admin/bots')).toBeUndefined();

    const resOwner = await request(app).get('/sitemap.json?access=owner');
    expect(resOwner.body.urls.every((u: any) => u.access === 'owner')).toBe(true);
    expect(resOwner.body.urls.find((u: any) => u.url === '/admin/mcp')).toBeDefined();
  });
});
