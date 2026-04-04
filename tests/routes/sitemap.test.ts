import express from 'express';
import request from 'supertest';
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
    expect(Array.isArray(res.body.data.urls)).toBe(true);
    expect(res.body.data.urls.length).toBeGreaterThan(0);

    // Check for absence of /uber paths
    const uberUrl = res.body.data.urls.find((u: any) => u.url.startsWith('/uber'));
    expect(uberUrl).toBeUndefined();

    // Check for existence of /admin/bots
    const adminUrl = res.body.data.urls.find((u: any) => u.url === '/admin/bots');
    expect(adminUrl).toEqual(expect.objectContaining({ url: '/admin/bots' }));
    expect(adminUrl.access).toBe('authenticated');
  });

  it('should include new routes like /admin/ai/dashboard', async () => {
    const res = await request(app).get('/sitemap.json');
    const aiUrl = res.body.data.urls.find((u: any) => u.url === '/admin/ai/dashboard');
    expect(aiUrl).toEqual(expect.objectContaining({ url: '/admin/ai/dashboard' }));
    expect(aiUrl.description).toBe('AI System Dashboard');
  });

  it('should include integrations routes', async () => {
    const res = await request(app).get('/sitemap.json');
    const llmUrl = res.body.data.urls.find((u: any) => u.url === '/admin/integrations/llm');
    expect(llmUrl).toEqual(expect.objectContaining({ url: '/admin/integrations/llm' }));
  });

  it('should filter by access level', async () => {
    // Test public filter
    const publicRes = await request(app).get('/sitemap.json?access=public');
    const publicUrls = publicRes.body.data.urls;
    expect(publicUrls.every((u: any) => u.access === 'public')).toBe(true);
    expect(publicUrls.find((u: any) => u.url === '/admin/bots')).toBeUndefined(); // authenticated
    expect(publicUrls).toContainEqual(expect.objectContaining({ url: '/login' })); // public

    // Test authenticated filter
    const authRes = await request(app).get('/sitemap.json?access=authenticated');
    const authUrls = authRes.body.data.urls;
    expect(authUrls.every((u: any) => u.access === 'authenticated')).toBe(true);
    expect(authUrls).toContainEqual(expect.objectContaining({ url: '/admin/bots' }));
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
