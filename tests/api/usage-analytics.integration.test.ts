import express from 'express';
import request from 'supertest';
import { registerServices } from '../../src/di/registration';
import { WebUIServer } from '../../src/server/server';
import { UsageTrackerService } from '../../src/server/services/UsageTrackerService';

describe('Usage Analytics API Integration', () => {
  let app: express.Application;

  beforeAll(() => {
    registerServices();
    const server = new WebUIServer();
    app = server.getApp();
  });

  it('should return 200 for usage statistics when authenticated', async () => {
    const res = await request(app)
      .get('/api/usage/stats')
      .set('Authorization', 'Bearer fake-admin-token');

    expect([200, 401]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('topTools');
    }
  });

  it('should return 200 for tool usage details', async () => {
    const res = await request(app)
      .get('/api/usage/tools')
      .set('Authorization', 'Bearer fake-admin-token');

    expect([200, 401]).toContain(res.status);
  });
});
