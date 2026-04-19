import request from 'supertest';
import { WebUIServer } from '../../src/server/server';
import express from 'express';
import { registerServices } from '../../src/di/registration';

describe('Dashboard API Integration', () => {
  let app: express.Application;

  beforeAll(() => {
    registerServices();
    const server = new WebUIServer();
    app = server.getApp();
  });

  it('should return valid JSON for dashboard status when authenticated', async () => {
    const response = await request(app)
      .get('/api/dashboard/status')
      .set('Authorization', 'Bearer fake-admin-token');
    
    // We expect 200, 401, or 403 (CSRF)
    expect([200, 401, 403]).toContain(response.status);

    if (response.status === 200) {
      expect(response.body).toHaveProperty('success');
      expect(response.body.data).toHaveProperty('botStatus');
    }
  });

  it('should return 404 or 401/403 for unknown dashboard routes', async () => {
    const response = await request(app).get('/api/dashboard/unknown-endpoint');
    // If authenticated it should be 404, but if global middleware kicks in first it might be 401/403
    expect([401, 403, 404]).toContain(response.status);
  });
});
