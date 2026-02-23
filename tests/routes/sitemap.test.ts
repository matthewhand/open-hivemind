
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
    expect(adminUrl.description).toBe('Bot Management Hub');

    // Check for absence of /uber paths
    const uberUrl = res.body.urls.find((u: any) => u.url.startsWith('/uber'));
    expect(uberUrl).toBeUndefined();
  });

  it('should find new routes like /admin/ai/dashboard', async () => {
    const res = await request(app).get('/sitemap.json');
    const aiUrl = res.body.urls.find((u: any) => u.url === '/admin/ai/dashboard');
    expect(aiUrl).toBeDefined();
    expect(aiUrl.description).toBe('AI Intelligence Dashboard');
  });

  it('should include user dashboard routes', async () => {
    const res = await request(app).get('/sitemap.json');
    const dashboardUrl = res.body.urls.find((u: any) => u.url === '/dashboard');
    expect(dashboardUrl).toBeDefined();
    expect(dashboardUrl.access).toBe('authenticated');
  });

  it('should return sitemap.xml with correct content type', async () => {
    const res = await request(app).get('/sitemap.xml');
    expect(res.status).toBe(200);
    expect(res.header['content-type']).toContain('application/xml');
    expect(res.text).toMatch(/<loc>http:\/\/127\.0\.0\.1:\d+\/admin\/overview<\/loc>/);
  });

  it('should return HTML sitemap', async () => {
    const res = await request(app).get('/sitemap');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Open-Hivemind Sitemap');
    expect(res.text).toContain('/admin/overview');
  });
});
