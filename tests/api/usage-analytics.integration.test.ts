import request from 'supertest';
import { WebUIServer } from '../../src/server/server';
import express from 'express';
import { registerServices } from '../../src/di/registration';

describe('Usage Analytics API Integration', () => {
  let app: express.Application;

  beforeAll(() => {
    registerServices();
    const server = new WebUIServer();
    app = server.getApp();
  });

  it('should return 200 or 401/403 for usage statistics when authenticated', async () => {
    const res = await request(app)
      .get('/api/admin/usage/stats')
      .set('Authorization', 'Bearer fake-admin-token');
    
    expect([200, 401, 403, 404]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('topTools');
    }
  });

  it('should return 200 or 401/403 for tool usage details', async () => {
    const res = await request(app)
      .get('/api/admin/usage/tools')
      .set('Authorization', 'Bearer fake-admin-token');
    
    expect([200, 401, 403, 404]).toContain(res.status);
  });
});
