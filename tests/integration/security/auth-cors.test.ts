import { describe, expect, it } from '@jest/globals';
import request from 'supertest';
import app from '../../../src/index';

describe('CORS Security Integration Tests', () => {
  describe('CORS Policy Enforcement', () => {
    it('should allow requests from localhost origins in development/test', async () => {
      const origins = [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
      ];

      for (const origin of origins) {
        const response = await request(app)
          .get('/api/health')
          .set('Origin', origin);

        expect(response.headers['access-control-allow-origin']).toBe(origin);
        expect(response.headers['access-control-allow-credentials']).toBe('true');
      }
    });

    it('should handle CORS preflight requests', async () => {
      const response = await request(app)
        .options('/api/config')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type, Authorization');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
      expect(response.headers['access-control-allow-methods']).toContain('POST');
    });

    it('should not allow random origins if not configured', async () => {
        const response = await request(app)
          .get('/api/health')
          .set('Origin', 'https://malicious-site.com');

        expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });
  });
});
