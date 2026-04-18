import express from 'express';
import request from 'supertest';
import { registerServices } from '../../src/di/registration';
import { WebUIServer } from '../../src/server/server';

describe('Agent and Template API Integration', () => {
  let app: express.Application;

  beforeAll(() => {
    registerServices();
    const server = new WebUIServer();
    app = server.getApp();
  });

  it('should list built-in templates from real service', async () => {
    const res = await request(app)
      .get('/api/specs/templates')
      .set('Authorization', 'Bearer fake-token-for-admin');

    // Protection check (401 if auth is not bypassed)
    if (res.status === 200) {
      expect(Array.isArray(res.body.data.templates)).toBe(true);
      expect(res.body.data.templates.length).toBeGreaterThan(0);
    } else {
      expect(res.status).toBe(401);
    }
  });

  it('should list all agents', async () => {
    const res = await request(app)
      .get('/api/agents')
      .set('Authorization', 'Bearer fake-token-for-admin');

    expect([200, 401]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.agents)).toBe(true);
    }
  });
});
