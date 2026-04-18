import express from 'express';
import request from 'supertest';
import { WebUIServer } from '../../src/server/server';

describe('App Security Middleware Integration', () => {
  let app: express.Application;

  beforeAll(() => {
    // Create the real WebUI server
    const server = new WebUIServer();
    app = server.getApp();
  });

  it('should apply security headers to all responses', async () => {
    const response = await request(app).get('/health');

    // Assert real security headers added by `securityHeaders` middleware
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('DENY');
    expect(response.headers['x-xss-protection']).toBe('1; mode=block');
    expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(response.headers['content-security-policy']).toContain("default-src 'self'");
  });

  it('should properly configure CORS for localhost by default', async () => {
    const response = await request(app)
      .options('/api/health')
      .set('Origin', 'http://localhost:3000');

    expect(response.status).toBe(200); // Options success status
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
  });

  it('should prevent giant payloads on API endpoints', async () => {
    const largePayload = { data: 'A'.repeat(11 * 1024 * 1024) }; // 11 MB
    const response = await request(app).post('/api/config').send(largePayload);

    // Express body-parser should reject it (413 Payload Too Large)
    expect(response.status).toBe(413);
  });
});
