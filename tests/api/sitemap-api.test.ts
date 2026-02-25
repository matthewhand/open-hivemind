import express from 'express';
import request from 'supertest';
import sitemapRouter from '../../src/server/routes/sitemap';

describe('Sitemap API Endpoints', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use('/', sitemapRouter);
  });

  it('should return sitemap.xml', async () => {
    const response = await request(app).get('/sitemap.xml').expect(200);
    expect(response.headers['content-type']).toMatch(/application\/xml/);
    expect(response.text).toContain('<urlset');
    expect(response.text).toContain('/admin');
  });

  it('should return sitemap.json', async () => {
    const response = await request(app).get('/sitemap.json').expect(200);
    expect(response.body).toHaveProperty('urls');
    expect(Array.isArray(response.body.urls)).toBe(true);
    const urls = response.body.urls.map((u: any) => u.url);
    expect(urls).toContain('/admin');
    expect(urls).toContain('/admin/ai/dashboard'); // Verify new AI routes
  });

  it('should return HTML sitemap', async () => {
    const response = await request(app).get('/sitemap').expect(200);
    expect(response.text).toContain('<!DOCTYPE html>');
    expect(response.text).toContain('Open-Hivemind Sitemap');
    expect(response.text).toContain('Admin Dashboard');
    expect(response.text).toContain('AI & Intelligence');
  });
});
