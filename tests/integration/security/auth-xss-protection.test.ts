import { describe, expect, it } from '@jest/globals';
import request from 'supertest';
import app from '../../../src/index';

describe('XSS Protection & CSP Integration Tests', () => {
  describe('Content Security Policy', () => {
    it('should include strong CSP headers on the root page', async () => {
      const response = await request(app).get('/');

      const cspHeader = response.headers['content-security-policy'] || response.headers['Content-Security-Policy'];
      expect(cspHeader).toBeDefined();
      expect(cspHeader).toContain("default-src 'self'");
    });

    it('should include X-Content-Type-Options: nosniff', async () => {
      const response = await request(app).get('/api/health');
      const header = response.headers['x-content-type-options'] || response.headers['X-Content-Type-Options'];
      expect(header).toBe('nosniff');
    });
  });

  describe('Input Sanitization', () => {
    it('should sanitize malicious input in POST requests', async () => {
       const xssPayload = '<script>alert("XSS")</script>';
       const response = await request(app)
         .post('/api/config')
         .send({
             name: 'test-config',
             description: xssPayload
         });

       if (response.status === 200 || response.status === 201) {
           const bodyString = JSON.stringify(response.body);
           expect(bodyString).not.toContain('<script>');
           // It should be escaped
           expect(bodyString).toContain('&lt;script&gt;');
       }
    });
  });
});
