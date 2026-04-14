import 'reflect-metadata';
import request from 'supertest';
import express from 'express';
import { registerRoutes } from '@src/server/registerRoutes';

describe('LLM Test Endpoint Contract', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    // We only need the routes to test the endpoint contract
    registerRoutes(app, { frontendDistPath: '', viteServerRef: { current: null } } as any);
  });

  it('should return 400 for invalid provider type', async () => {
    const res = await request(app)
      .post('/api/admin/providers/test-connection')
      .send({ providerType: 'invalid-type', config: {} });
    
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Validation failed');
  });

  it('should validate request body and return 400 if empty', async () => {
    const res = await request(app)
      .post('/api/admin/providers/test-connection')
      .send({});
    
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Validation failed');
  });
});
