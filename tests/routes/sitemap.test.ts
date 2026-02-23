import request from 'supertest';
import express from 'express';
import sitemapRouter from '../../src/server/routes/sitemap';

describe('Sitemap Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use('/', sitemapRouter);
  });

  describe('GET /sitemap.json', () => {
    it('should return sitemap data in JSON format', async () => {
      const res = await request(app).get('/sitemap.json');
      expect(res.status).toBe(200);
      expect(res.header['content-type']).toMatch(/json/);
      expect(res.body).toHaveProperty('generated');
      expect(res.body).toHaveProperty('baseUrl');
      expect(res.body).toHaveProperty('totalUrls');
      expect(res.body).toHaveProperty('urls');
      expect(Array.isArray(res.body.urls)).toBe(true);
    });

    it('should include correct /admin routes', async () => {
      const res = await request(app).get('/sitemap.json');
      const urls = res.body.urls.map((u: any) => u.url);

      expect(urls).toContain('/admin');
      expect(urls).toContain('/admin/bots');
      expect(urls).toContain('/admin/ai/dashboard');
      expect(urls).toContain('/admin/settings');
      expect(urls).toContain('/admin/monitoring-dashboard');
      expect(urls).toContain('/admin/specs');
    });

    it('should not include old /uber routes', async () => {
      const res = await request(app).get('/sitemap.json');
      const urls = res.body.urls.map((u: any) => u.url);

      expect(urls).not.toContain('/uber');
      expect(urls).not.toContain('/uber/bots');
    });

    it('should filter by access level', async () => {
      const resPublic = await request(app).get('/sitemap.json?access=public');
      const publicUrls = resPublic.body.urls;
      expect(publicUrls.every((u: any) => u.access === 'public')).toBe(true);
      expect(publicUrls.find((u: any) => u.url === '/login')).toBeDefined();
      expect(publicUrls.find((u: any) => u.url === '/admin/bots')).toBeUndefined();

      const resAuth = await request(app).get('/sitemap.json?access=authenticated');
      const authUrls = resAuth.body.urls;
      expect(authUrls.every((u: any) => u.access === 'authenticated')).toBe(true);
      expect(authUrls.find((u: any) => u.url === '/admin/bots')).toBeDefined();
    });
  });

  describe('GET /sitemap.xml', () => {
    it('should return sitemap in XML format', async () => {
      const res = await request(app).get('/sitemap.xml');
      expect(res.status).toBe(200);
      expect(res.header['content-type']).toMatch(/xml/);
      expect(res.text).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(res.text).toContain('http://www.sitemaps.org/schemas/sitemap/0.9');
      expect(res.text).toContain('<loc>');
    });

    it('should include /admin routes in XML', async () => {
      const res = await request(app).get('/sitemap.xml');
      expect(res.text).toContain('/admin/bots');
      expect(res.text).toContain('/admin/ai/dashboard');
    });
  });

  describe('GET /sitemap', () => {
    it('should return HTML sitemap', async () => {
      const res = await request(app).get('/sitemap');
      expect(res.status).toBe(200);
      expect(res.header['content-type']).toMatch(/html/);
      expect(res.text).toContain('<!DOCTYPE html>');
      expect(res.text).toContain('Open-Hivemind Sitemap');
      expect(res.text).toContain('/admin/bots');
    });
  });
});
