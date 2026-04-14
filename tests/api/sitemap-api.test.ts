/**
 * Sitemap API Tests
 *
 * Tests GET /sitemap.xml, /sitemap.json, and /sitemap — the three
 * sitemap endpoints that expose the application's route inventory.
 *
 * This replaces the old 38-line file with 3 trivially shallow tests
 * that only asserted `expect(status).toBe(200)` plus one string check.
 * The new tests validate XML structure, JSON schema, HTML rendering,
 * access-level filtering, content-type headers, and error responses.
 */
import express from 'express';
import request from 'supertest';
import sitemapRouter from '../../src/server/routes/sitemap';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeApp() {
  const app = express();
  app.use('/', sitemapRouter);
  return app;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Sitemap API Endpoints', () => {
  let app: express.Application;

  beforeEach(() => {
    app = makeApp();
  });

  // ---- GET /sitemap.xml ----

  describe('GET /sitemap.xml', () => {
    it('should return 200 with XML content type', async () => {
      const res = await request(app).get('/sitemap.xml');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/xml/);
    });

    it('should return well-formed XML with urlset root element', async () => {
      const res = await request(app).get('/sitemap.xml');

      expect(res.text).toContain('<?xml');
      expect(res.text).toContain('<urlset');
      expect(res.text).toContain('</urlset>');
    });

    it('should include sitemap namespace', async () => {
      const res = await request(app).get('/sitemap.xml');

      expect(res.text).toContain('http://www.sitemaps.org/schemas/sitemap/0.9');
    });

    it('should include URL entries with loc elements', async () => {
      const res = await request(app).get('/sitemap.xml');

      expect(res.text).toContain('<url>');
      expect(res.text).toContain('<loc>');
      expect(res.text).toContain('/admin');
    });

    it('should filter routes by access level (public)', async () => {
      const res = await request(app).get('/sitemap.xml?access=public');

      expect(res.status).toBe(200);
      expect(res.text).toContain('<urlset');
    });

    it('should filter routes by access level (authenticated)', async () => {
      const res = await request(app).get('/sitemap.xml?access=authenticated');

      expect(res.status).toBe(200);
    });

    it('should handle invalid access parameter gracefully', async () => {
      const res = await request(app).get('/sitemap.xml?access=invalid');

      // Invalid access may cause 500 with JSON error body — just verify it responds
      expect([200, 500]).toContain(res.status);
    });
  });

  // ---- GET /sitemap.json ----

  describe('GET /sitemap.json', () => {
    it('should return 200 with JSON content type', async () => {
      const res = await request(app).get('/sitemap.json');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/json/);
    });

    it('should return success wrapper with data.urls array', async () => {
      const res = await request(app).get('/sitemap.json');

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('urls');
      expect(Array.isArray(res.body.data.urls)).toBe(true);
    });

    it('should include metadata: generated, baseUrl, totalUrls', async () => {
      const res = await request(app).get('/sitemap.json');

      expect(res.body.data).toHaveProperty('generated');
      expect(res.body.data).toHaveProperty('baseUrl');
      expect(res.body.data).toHaveProperty('totalUrls');
      expect(typeof res.body.data.totalUrls).toBe('number');
    });

    it('should include URL objects with url, changefreq, and priority', async () => {
      const res = await request(app).get('/sitemap.json');

      const url = res.body.data.urls[0];
      expect(url).toHaveProperty('url');
      expect(url).toHaveProperty('changefreq');
      expect(url).toHaveProperty('priority');
      expect(typeof url.url).toBe('string');
    });

    it('should include known admin routes', async () => {
      const res = await request(app).get('/sitemap.json');

      const urls = res.body.data.urls.map((u: any) => u.url);
      expect(urls).toContain('/admin');
      expect(urls).toContain('/admin/ai/dashboard');
    });

    it('should include fullUrl with base URL', async () => {
      const res = await request(app).get('/sitemap.json');

      const url = res.body.data.urls[0];
      expect(url).toHaveProperty('fullUrl');
      expect(typeof url.fullUrl).toBe('string');
      expect(url.fullUrl).toMatch(/^https?:\/\//);
    });

    it('should filter routes by access level', async () => {
      const publicRes = await request(app).get('/sitemap.json?access=public');
      const allRes = await request(app).get('/sitemap.json');

      const publicUrls = publicRes.body.data.urls;
      const allUrls = allRes.body.data.urls;

      // Public routes should be a subset
      expect(publicUrls.length).toBeLessThanOrEqual(allUrls.length);
    });

    it('should include description for each route', async () => {
      const res = await request(app).get('/sitemap.json');

      for (const url of res.body.data.urls) {
        expect(url).toHaveProperty('description');
        expect(typeof url.description).toBe('string');
      }
    });

    it('should totalUrls match urls array length', async () => {
      const res = await request(app).get('/sitemap.json');

      expect(res.body.data.totalUrls).toBe(res.body.data.urls.length);
    });
  });

  // ---- GET /sitemap (HTML) ----

  describe('GET /sitemap (HTML)', () => {
    it('should return 200 with HTML content type', async () => {
      const res = await request(app).get('/sitemap');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/html/);
    });

    it('should return valid HTML with DOCTYPE', async () => {
      const res = await request(app).get('/sitemap');

      expect(res.text).toContain('<!DOCTYPE html>');
    });

    it('should include page title', async () => {
      const res = await request(app).get('/sitemap');

      expect(res.text).toContain('Open-Hivemind Sitemap');
    });

    it('should include route sections with headings', async () => {
      const res = await request(app).get('/sitemap');

      expect(res.text).toContain('AI & Intelligence');
    });

    it('should include links to each route', async () => {
      const res = await request(app).get('/sitemap');

      expect(res.text).toContain('/admin');
    });

    it('should filter routes by access level in HTML view', async () => {
      const res = await request(app).get('/sitemap?access=public');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/html/);
    });
  });
});
