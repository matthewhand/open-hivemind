import express from 'express';
import request from 'supertest';
import sitemapRouter from '../src/server/routes/sitemap';

describe('Sitemap Routes Reproduction', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use('/', sitemapRouter);
  });

  it('should return sitemap.json with incorrect /uber paths', async () => {
    const res = await request(app).get('/sitemap.json');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.urls)).toBe(true);

    // Check for existence of /admin/bots (which should be there now)
    const adminUrl = res.body.urls.find((u: any) => u.url === '/admin/bots');
    expect(adminUrl).not.toBeUndefined();
  });

  it('should find new routes like /admin/ai/dashboard', async () => {
    const res = await request(app).get('/sitemap.json');
    const aiUrl = res.body.urls.find((u: any) => u.url.includes('/ai/dashboard'));
    expect(aiUrl).not.toBeUndefined();
  });
});
