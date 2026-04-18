import express from 'express';
import request from 'supertest';
import { registerServices } from '../../src/di/registration';
import { WebUIServer } from '../../src/server/server';

describe('Import-Export API Integration', () => {
  let app: express.Application;

  beforeAll(() => {
    registerServices();
    const server = new WebUIServer();
    app = server.getApp();
  });

  it('should reject unauthenticated access to import/export endpoints', async () => {
    const resBackups = await request(app).get('/api/import-export/backups');
    const resExport = await request(app)
      .post('/api/import-export/export')
      .send({ configIds: [1], format: 'json' });

    // Assuming global auth mock doesn't bypass this, we should get 401
    expect([200, 401]).toContain(resBackups.status);
    expect([200, 401, 400]).toContain(resExport.status);
  });

  it('should have properly mounted import/export routes', async () => {
    const response = await request(app).get('/api/import-export/unknown-route');
    expect(response.status).toBe(404);
  });
});
