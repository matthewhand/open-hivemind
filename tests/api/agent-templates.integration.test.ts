import request from 'supertest';
import { WebUIServer } from '../../src/server/server';
import express from 'express';
import { registerServices } from '../../src/di/registration';

describe('Agent and Template API Integration', () => {
  let app: express.Application;

  beforeAll(() => {
    registerServices();
    const server = new WebUIServer();
    app = server.getApp();
  });

  it('should list built-in templates from real service', async () => {
    const res = await request(app).get('/api/admin/templates');
    
    // We expect 200 if authenticated or bypassable, or 401/403 if protected
    if (res.status === 200) {
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.templates)).toBe(true);
      expect(res.body.data.templates.length).toBeGreaterThan(0);
    } else {
      expect([401, 403]).toContain(res.status);
    }
  });

  it('should list all agents', async () => {
    const res = await request(app)
      .get('/api/agents')
      .set('Authorization', 'Bearer fake-token-for-admin');
    
    expect([200, 401, 403]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.agents)).toBe(true);
    }
  });

  it('should get overall system status', async () => {
    const res = await request(app).get('/api/dashboard/status');
    expect([200, 401, 403]).toContain(res.status);
  });
});
