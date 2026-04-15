import request from 'supertest';
import { WebUIServer } from '../../src/server/server';
import express from 'express';

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
    expect(response.headers['strict-transport-security']).toBe('max-age=31536000');
    expect(response.headers['content-security-policy']).toBe("default-src 'self'");
    expect(response.headers['referrer-policy']).toBe('no-referrer');
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
    const response = await request(app)
      .post('/api/config')
      .send(largePayload);
    
    // Express body-parser should reject it (413 Payload Too Large)
    expect(response.status).toBe(413);
  });
});
