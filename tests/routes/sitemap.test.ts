
import request from 'supertest';
import express from 'express';
import sitemapRouter from '../../src/server/routes/sitemap';

describe('Sitemap Routes Reproduction', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use('/', sitemapRouter);
  });

  it('should return sitemap.json with correct /admin paths', async () => {
    const res = await request(app).get('/sitemap.json');
    expect(res.status).toBe(200);
    expect(res.body.urls).toBeDefined();

    // Check for absence of incorrect /uber paths
    const uberUrl = res.body.urls.find((u: any) => u.url === '/uber/bots');
    expect(uberUrl).toBeUndefined();

    // Check for existence of correct /admin paths
    const adminUrl = res.body.urls.find((u: any) => u.url === '/admin/bots');
    expect(adminUrl).toBeDefined();

    // Check for root pages
    const rootUrl = res.body.urls.find((u: any) => u.url === '/');
    expect(rootUrl).toBeDefined();

    const adminRoot = res.body.urls.find((u: any) => u.url === '/admin');
    expect(adminRoot).toBeDefined();
  });

  it('should find new routes like /admin/ai/dashboard', async () => {
    const res = await request(app).get('/sitemap.json');
    const aiUrl = res.body.urls.find((u: any) => u.url === '/admin/ai/dashboard');
    expect(aiUrl).toBeDefined();
  });

  it('should find dashboard and activity pages', async () => {
    const res = await request(app).get('/sitemap.json');
    const dashboard = res.body.urls.find((u: any) => u.url === '/dashboard');
    expect(dashboard).toBeDefined();

    const activity = res.body.urls.find((u: any) => u.url === '/activity');
    expect(activity).toBeDefined();
  });
});
