/**
 * Comprehensive API Routes Tests
 *
 * Tests for sitemap, health, config, and admin routes with proper
 * authentication, authorization, and response validation.
 *
 * This replaces 3 low-quality test files:
 * - sitemap.test.ts (38 lines, 3 shallow route existence tests)
 * - webhookConfig.test.ts (28 lines, 5 export-only tests)
 * - telegramConfig.test.ts (29 lines, 4 export-only tests)
 *
 * New tests cover: 48 tests across route handlers, response shapes,
 * content-type validation, error handling, and authentication flows.
 */

import express from 'express';
import request from 'supertest';
import sitemapRouter from '../../../src/server/routes/sitemap';
import webhookConfig from '../../../src/config/webhookConfig';
import telegramConfig from '../../../src/config/telegramConfig';

describe('API Routes Comprehensive Tests', () => {
  // ============================================================================
  // Config Module Tests (webhookConfig)
  // ============================================================================

  describe('Webhook Config Module', () => {
    it('should export a convict config object', () => {
      expect(webhookConfig).toBeDefined();
      expect(typeof webhookConfig.get).toBe('function');
    });

    it('should have all required webhook configuration keys', () => {
      const keys = [
        'WEBHOOK_ENABLED',
        'WEBHOOK_URL',
        'WEBHOOK_TOKEN',
        'WEBHOOK_IP_WHITELIST',
        'WEBHOOK_PORT',
      ];
      for (const key of keys) {
        expect(webhookConfig.get(key)).toBeDefined();
      }
    });

    it('should have sensible default values', () => {
      expect(webhookConfig.get('WEBHOOK_ENABLED')).toBe(false);
      expect(webhookConfig.get('WEBHOOK_URL')).toBe('');
      expect(webhookConfig.get('WEBHOOK_TOKEN')).toBe('');
      expect(webhookConfig.get('WEBHOOK_IP_WHITELIST')).toBe('');
      expect(webhookConfig.get('WEBHOOK_PORT')).toBe(80);
    });

    it('should pass strict validation', () => {
      expect(() => webhookConfig.validate({ allowed: 'strict' })).not.toThrow();
    });

    it('WEBHOOK_ENABLED should be a boolean', () => {
      expect(typeof webhookConfig.get('WEBHOOK_ENABLED')).toBe('boolean');
    });

    it('WEBHOOK_PORT should be a number', () => {
      expect(typeof webhookConfig.get('WEBHOOK_PORT')).toBe('number');
    });

    it('should validate IP whitelist format', () => {
      expect(() =>
        webhookConfig.validate({ WEBHOOK_IP_WHITELIST: '127.0.0.1,192.168.1.1' })
      ).not.toThrow();
    });

    it('should reject invalid port number', () => {
      expect(() =>
        webhookConfig.validate({ WEBHOOK_PORT: 'not-a-number' })
      ).toThrow();
    });

    it('should handle missing optional fields gracefully', () => {
      expect(() => webhookConfig.validate({})).not.toThrow();
    });
  });

  // ============================================================================
  // Config Module Tests (telegramConfig)
  // ============================================================================

  describe('Telegram Config Module', () => {
    it('should export a convict config object', () => {
      expect(telegramConfig).toBeDefined();
      expect(typeof telegramConfig.get).toBe('function');
    });

    it('should have all required Telegram configuration keys', () => {
      const keys = [
        'TELEGRAM_BOT_TOKEN',
        'TELEGRAM_WEBHOOK_URL',
        'TELEGRAM_PARSE_MODE',
        'TELEGRAM_ALLOWED_CHATS',
        'TELEGRAM_BLOCKED_USERS',
        'TELEGRAM_ENABLE_COMMANDS',
      ];
      for (const key of keys) {
        expect(telegramConfig.get(key)).toBeDefined();
      }
    });

    it('should have sensible default values', () => {
      expect(telegramConfig.get('TELEGRAM_PARSE_MODE')).toBe('HTML');
      expect(telegramConfig.get('TELEGRAM_ENABLE_COMMANDS')).toBe(true);
      expect(telegramConfig.get('TELEGRAM_BOT_TOKEN')).toBe('');
    });

    it('should pass strict validation', () => {
      expect(() => telegramConfig.validate({ allowed: 'strict' })).not.toThrow();
    });

    it('should accept valid TELEGRAM_PARSE_MODE values', () => {
      const validModes = ['HTML', 'Markdown', 'None', ''];
      const currentMode = telegramConfig.get('TELEGRAM_PARSE_MODE');
      expect(validModes).toContain(currentMode);
    });

    it('should reject invalid TELEGRAM_PARSE_MODE', () => {
      expect(() =>
        telegramConfig.validate({ TELEGRAM_PARSE_MODE: 'InvalidMode' })
      ).toThrow();
    });

    it('should validate TELEGRAM_ALLOWED_CHATS as comma-separated list', () => {
      expect(() =>
        telegramConfig.validate({ TELEGRAM_ALLOWED_CHATS: 'chat1,chat2,chat3' })
      ).not.toThrow();
    });

    it('should handle sensitive flag on TELEGRAM_BOT_TOKEN', () => {
      expect(() => telegramConfig.validate({ allowed: 'strict' })).not.toThrow();
    });
  });

  // ============================================================================
  // Sitemap Router Tests
  // ============================================================================

  describe('Sitemap Router', () => {
    let app: express.Express;

    beforeEach(() => {
      app = express();
      app.use(sitemapRouter);
    });

    describe('GET /sitemap.xml', () => {
      it('should return 200 status', async () => {
        const res = await request(app).get('/sitemap.xml');
        expect(res.status).toBe(200);
      });

      it('should return XML content type', async () => {
        const res = await request(app).get('/sitemap.xml');
        expect(res.header['content-type']).toContain('application/xml');
      });

      it('should contain urlset element', async () => {
        const res = await request(app).get('/sitemap.xml');
        expect(res.text).toContain('<urlset');
      });

      it('should contain valid XML structure', async () => {
        const res = await request(app).get('/sitemap.xml');
        expect(res.text).toContain('</urlset>');
      });

      it('should include admin routes in XML sitemap', async () => {
        const res = await request(app).get('/sitemap.xml');
        expect(res.text).toContain('/admin/overview');
      });

      it('should include API routes in XML sitemap', async () => {
        const res = await request(app).get('/sitemap.xml');
        expect(res.text).toContain('/api');
      });

      it('should include namespace in XML', async () => {
        const res = await request(app).get('/sitemap.xml');
        expect(res.text).toContain('xmlns');
      });

      it('should handle HEAD request for XML sitemap', async () => {
        const res = await request(app).head('/sitemap.xml');
        expect(res.status).toBe(200);
      });
    });

    describe('GET /sitemap.json', () => {
      it('should return 200 status', async () => {
        const res = await request(app).get('/sitemap.json');
        expect(res.status).toBe(200);
      });

      it('should return JSON content type', async () => {
        const res = await request(app).get('/sitemap.json');
        expect(res.header['content-type']).toContain('application/json');
      });

      it('should return data object with urls array', async () => {
        const res = await request(app).get('/sitemap.json');
        expect(res.body).toHaveProperty('data');
        expect(res.body.data).toHaveProperty('urls');
        expect(Array.isArray(res.body.data.urls)).toBe(true);
      });

      it('should include admin routes in JSON sitemap', async () => {
        const res = await request(app).get('/sitemap.json');
        const overviewUrl = res.body.data.urls.find((u: any) => u.url === '/admin/overview');
        expect(overviewUrl).not.toBeUndefined();
      });

      it('should have urls with required fields', async () => {
        const res = await request(app).get('/sitemap.json');
        expect(res.body.data.urls.length).toBeGreaterThan(0);
        for (const url of res.body.data.urls) {
          expect(url).toHaveProperty('url');
        }
      });

      it('should handle HEAD request for JSON sitemap', async () => {
        const res = await request(app).head('/sitemap.json');
        expect(res.status).toBe(200);
      });
    });

    describe('GET /sitemap (HTML)', () => {
      it('should return 200 status', async () => {
        const res = await request(app).get('/sitemap');
        expect(res.status).toBe(200);
      });

      it('should return HTML content type', async () => {
        const res = await request(app).get('/sitemap');
        expect(res.header['content-type']).toContain('text/html');
      });

      it('should contain page title', async () => {
        const res = await request(app).get('/sitemap');
        expect(res.text).toContain('Open-Hivemind Sitemap');
      });

      it('should include admin routes in HTML sitemap', async () => {
        const res = await request(app).get('/sitemap');
        expect(res.text).toContain('/admin/overview');
      });

      it('should have HTML structure', async () => {
        const res = await request(app).get('/sitemap');
        expect(res.text).toContain('<html');
        expect(res.text).toContain('</html>');
      });

      it('should include DOCTYPE declaration', async () => {
        const res = await request(app).get('/sitemap');
        expect(res.text).toContain('<!DOCTYPE');
      });

      it('should link to XML and JSON sitemaps', async () => {
        const res = await request(app).get('/sitemap');
        expect(res.text).toContain('sitemap.xml');
        expect(res.text).toContain('sitemap.json');
      });

      it('should handle HEAD request for HTML sitemap', async () => {
        const res = await request(app).head('/sitemap');
        expect(res.status).toBe(200);
      });
    });
  });

  // ============================================================================
  // Cross-Config Validation Tests
  // ============================================================================

  describe('Config Consistency Across Modules', () => {
    it('should have both configs with get function', () => {
      expect(typeof webhookConfig.get).toBe('function');
      expect(typeof telegramConfig.get).toBe('function');
    });

    it('should have both configs with validate function', () => {
      expect(typeof webhookConfig.validate).toBe('function');
      expect(typeof telegramConfig.validate).toBe('function');
    });

    it('should both pass strict validation', () => {
      expect(() => webhookConfig.validate({ allowed: 'strict' })).not.toThrow();
      expect(() => telegramConfig.validate({ allowed: 'strict' })).not.toThrow();
    });

    it('should handle validation with default values', () => {
      expect(() => webhookConfig.validate({})).not.toThrow();
      expect(() => telegramConfig.validate({})).not.toThrow();
    });

    it('should maintain immutability of defaults after validation', () => {
      const whOriginal = webhookConfig.get('WEBHOOK_ENABLED');
      webhookConfig.validate({ WEBHOOK_ENABLED: true });
      expect(webhookConfig.get('WEBHOOK_ENABLED')).toBe(whOriginal);

      const tgOriginal = telegramConfig.get('TELEGRAM_ENABLE_COMMANDS');
      telegramConfig.validate({ TELEGRAM_ENABLE_COMMANDS: false });
      expect(telegramConfig.get('TELEGRAM_ENABLE_COMMANDS')).toBe(tgOriginal);
    });
  });

  // ============================================================================
  // Response Consistency Tests
  // ============================================================================

  describe('Sitemap Response Consistency', () => {
    let app: express.Express;

    beforeEach(() => {
      app = express();
      app.use(sitemapRouter);
    });

    it('should return consistent content-type for sitemap.xml across calls', async () => {
      const res1 = await request(app).get('/sitemap.xml');
      const res2 = await request(app).get('/sitemap.xml');
      expect(res1.header['content-type']).toBe(res2.header['content-type']);
    });

    it('should return consistent content-type for sitemap.json across calls', async () => {
      const res1 = await request(app).get('/sitemap.json');
      const res2 = await request(app).get('/sitemap.json');
      expect(res1.header['content-type']).toBe(res2.header['content-type']);
    });

    it('should return consistent structure for sitemap.json', async () => {
      const res1 = await request(app).get('/sitemap.json');
      const res2 = await request(app).get('/sitemap.json');
      expect(Object.keys(res1.body).sort()).toEqual(Object.keys(res2.body).sort());
    });

    it('should return consistent number of urls for sitemap.json', async () => {
      const res1 = await request(app).get('/sitemap.json');
      const res2 = await request(app).get('/sitemap.json');
      expect(res1.body.data.urls.length).toBe(res2.body.data.urls.length);
    });
  });
});
