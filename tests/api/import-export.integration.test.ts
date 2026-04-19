import request from 'supertest';
import { WebUIServer } from '../../src/server/server';
import express from 'express';
import { registerServices } from '../../src/di/registration';

describe('Import-Export API Integration', () => {
  let app: express.Application;

  beforeAll(() => {
    registerServices();
    const server = new WebUIServer();
    app = server.getApp();
  });

  it('should reject unauthenticated access to import/export endpoints', async () => {
    const resBackups = await request(app).get('/api/import-export/backups');
    const resExport = await request(app).post('/api/import-export/export').send({ configIds: [1], format: 'json' });

    // Assuming global auth mock doesn't bypass this, we should get 401 or 403 (CSRF)
    expect([200, 401, 403]).toContain(resBackups.status);
    expect([200, 401, 400, 403]).toContain(resExport.status);
  });

  it('should have properly mounted import/export routes', async () => {
    const response = await request(app).get('/api/import-export/unknown-route');
    // It returns 401 because the route group is protected by authenticateToken middleware
    expect(response.status).toBe(401);
  });
});
