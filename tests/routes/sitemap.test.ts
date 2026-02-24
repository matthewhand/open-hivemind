import request from 'supertest';
import express from 'express';
import sitemapRouter from '../../src/server/routes/sitemap';

describe('Sitemap Routes', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use('/', sitemapRouter);
  });

  describe('GET /sitemap.xml', () => {
    it('should return valid XML sitemap', async () => {
      const response = await request(app).get('/sitemap.xml');

      expect(response.status).toBe(200);
      expect(response.header['content-type']).toContain('application/xml');
      expect(response.text).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(response.text).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
      // Verify paths are present (ignoring dynamic host/port from supertest)
      expect(response.text).toMatch(/<loc>http:\/\/.*\/<\/loc>/);
      expect(response.text).toMatch(/<loc>http:\/\/.*\/admin\/overview<\/loc>/);
    });

    it('should filter by access level', async () => {
      const response = await request(app).get('/sitemap.xml?access=owner');

      expect(response.status).toBe(200);
      // It should contain owner routes
      expect(response.text).toContain('/admin/mcp');
      // It should NOT contain public routes if we filter strictly?
      // Wait, the implementation says:
      // if (accessLevel) { filteredRoutes = routes.filter((route) => route.access === accessLevel); }
      // So yes, it returns ONLY that access level.
      expect(response.text).not.toContain('/login'); // login is public
    });
  });

  describe('GET /sitemap.json', () => {
    it('should return valid JSON sitemap', async () => {
      const response = await request(app).get('/sitemap.json');

      expect(response.status).toBe(200);
      expect(response.header['content-type']).toContain('application/json');

      const body = response.body;
      expect(body).toHaveProperty('generated');
      expect(body).toHaveProperty('baseUrl');
      expect(body).toHaveProperty('totalUrls');
      expect(body).toHaveProperty('urls');
      expect(Array.isArray(body.urls)).toBe(true);

      // Check for a known public route
      const rootUrl = body.urls.find((u: any) => u.url === '/');
      expect(rootUrl).toBeDefined();
      expect(rootUrl.access).toBe('public');
    });

    it('should filter by access level', async () => {
      const response = await request(app).get('/sitemap.json?access=owner');

      expect(response.status).toBe(200);
      const urls = response.body.urls;

      // Check for owner route
      const ownerUrl = urls.find((u: any) => u.url === '/admin/mcp');
      expect(ownerUrl).toBeDefined();

      // Check that public route is missing
      const publicUrl = urls.find((u: any) => u.url === '/login');
      expect(publicUrl).toBeUndefined();
    });
  });

  describe('GET /sitemap', () => {
    it('should return HTML sitemap', async () => {
      const response = await request(app).get('/sitemap');

      expect(response.status).toBe(200);
      expect(response.header['content-type']).toContain('text/html');
      expect(response.text).toContain('<!DOCTYPE html>');
      expect(response.text).toContain('Open-Hivemind Sitemap');

      // Check that it lists some routes
      expect(response.text).toContain('/admin/overview');
    });
  });
});
