
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

    // Check for absence of /uber paths
    const uberUrl = res.body.urls.find((u: any) => u.url === '/uber/bots');
    expect(uberUrl).toBeUndefined();
  });

  it('should find new routes like /admin/ai/dashboard', async () => {
    const res = await request(app).get('/sitemap.json');
    const aiUrl = res.body.urls.find((u: any) => u.url === '/admin/ai/dashboard');
    expect(aiUrl).toBeDefined();
  });

  it('should find monitoring dashboard routes', async () => {
    const res = await request(app).get('/sitemap.json');
    const monitoringUrl = res.body.urls.find((u: any) => u.url === '/admin/monitoring-dashboard');
    expect(monitoringUrl).toBeDefined();
  });

  it('should find integration routes', async () => {
    const res = await request(app).get('/sitemap.json');
    const integrationUrl = res.body.urls.find((u: any) => u.url === '/admin/integrations/llm');
    expect(integrationUrl).toBeDefined();
  });
});
