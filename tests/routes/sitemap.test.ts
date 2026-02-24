
import request from 'supertest';
import express from 'express';
import sitemapRouter from '../../src/server/routes/sitemap';

describe('Sitemap Routes Verification', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use('/', sitemapRouter);
  });

  it('should return sitemap.json with correct /admin paths', async () => {
    const res = await request(app).get('/sitemap.json');
    expect(res.status).toBe(200);
    expect(res.body.urls).toBeDefined();

    // Check for absence of /uber paths
    const uberUrl = res.body.urls.find((u: any) => u.url.startsWith('/uber'));
    expect(uberUrl).toBeUndefined();

    // Check for existence of /admin/bots
    const adminUrl = res.body.urls.find((u: any) => u.url === '/admin/bots');
    expect(adminUrl).toBeDefined();
    expect(adminUrl.access).toBe('authenticated');
  });

  it('should include new routes like /admin/ai/dashboard', async () => {
    const res = await request(app).get('/sitemap.json');
    const aiUrl = res.body.urls.find((u: any) => u.url === '/admin/ai/dashboard');
    expect(aiUrl).toBeDefined();
    expect(aiUrl.description).toBe('AI System Dashboard');
  });

  it('should include integrations routes', async () => {
    const res = await request(app).get('/sitemap.json');
    const llmUrl = res.body.urls.find((u: any) => u.url === '/admin/integrations/llm');
    expect(llmUrl).toBeDefined();
  });

  it('should filter by access level', async () => {
    // Test public filter
    const publicRes = await request(app).get('/sitemap.json?access=public');
    const publicUrls = publicRes.body.urls;
    expect(publicUrls.every((u: any) => u.access === 'public')).toBe(true);
    expect(publicUrls.find((u: any) => u.url === '/admin/bots')).toBeUndefined(); // authenticated
    expect(publicUrls.find((u: any) => u.url === '/login')).toBeDefined(); // public

    // Test authenticated filter
    const authRes = await request(app).get('/sitemap.json?access=authenticated');
    const authUrls = authRes.body.urls;
    expect(authUrls.every((u: any) => u.access === 'authenticated')).toBe(true);
    expect(authUrls.find((u: any) => u.url === '/admin/bots')).toBeDefined();
  });

  it('should return sitemap.xml', async () => {
    const res = await request(app).get('/sitemap.xml');
    expect(res.status).toBe(200);
    expect(res.header['content-type']).toContain('application/xml');
    expect(res.text).toMatch(/<loc>http:\/\/.*\/admin\/bots<\/loc>/);
  });

  it('should return HTML sitemap', async () => {
    const res = await request(app).get('/sitemap');
    expect(res.status).toBe(200);
    expect(res.header['content-type']).toContain('text/html');
    expect(res.text).toContain('Open-Hivemind Sitemap');
    expect(res.text).toContain('/admin/bots');
  });
});
