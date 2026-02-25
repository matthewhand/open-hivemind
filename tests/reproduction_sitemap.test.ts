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
    expect(res.body.urls).toBeDefined();

    // Check for existence of /uber paths (which are currently there but wrong)
    const uberUrl = res.body.urls.find((u: any) => u.url === '/uber/bots');
    expect(uberUrl).toBeDefined();

    // Check for absence of /admin/bots (which should be there)
    const adminUrl = res.body.urls.find((u: any) => u.url === '/admin/bots');
    expect(adminUrl).toBeUndefined();
  });

  it('should fail to find new routes like /admin/ai/dashboard', async () => {
    const res = await request(app).get('/sitemap.json');
    const aiUrl = res.body.urls.find((u: any) => u.url.includes('/ai/dashboard'));
    expect(aiUrl).toBeUndefined();
  });
});
