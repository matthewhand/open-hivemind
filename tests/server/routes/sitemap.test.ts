import express from 'express';
import request from 'supertest';
import sitemapRouter from '../../../src/server/routes/sitemap';

describe('Sitemap Router', () => {
  let app: express.Express;

  beforeEach(() => {
    app = express();
    app.use(sitemapRouter);
  });

  it('GET /sitemap.xml should return XML content', async () => {
    const res = await request(app).get('/sitemap.xml');
    expect(res.status).toBe(200);
    expect(res.header['content-type']).toContain('application/xml');
    expect(res.text).toContain('<urlset');
    expect(res.text).toContain('/admin/overview');
  });

  it('GET /sitemap.json should return JSON content', async () => {
    const res = await request(app).get('/sitemap.json');
    expect(res.status).toBe(200);
    expect(res.header['content-type']).toContain('application/json');
    expect(Array.isArray(res.body.data.urls)).toBe(true);
    expect(res.body.data.urls.length).toBeGreaterThan(0);
    const overviewUrl = res.body.data.urls.find((u: any) => u.url === '/admin/overview');
    expect(overviewUrl).not.toBeUndefined();
  });

  it('GET /sitemap should return HTML content', async () => {
    const res = await request(app).get('/sitemap');
    expect(res.status).toBe(200);
    expect(res.header['content-type']).toContain('text/html');
    expect(res.text).toContain('Open-Hivemind Sitemap');
    expect(res.text).toContain('/admin/overview');
  });
});
