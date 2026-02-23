import express from 'express';
import request from 'supertest';
import openapiRouter from '../../src/server/routes/openapi';

describe('OpenAPI Integration', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    // Simulate mounting at /api as per src/index.ts
    app.use('/api', openapiRouter);
  });

  it('GET /api/openapi.json should return JSON spec', async () => {
    const response = await request(app).get('/api/openapi.json');
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/application\/json/);
    expect(response.body.openapi).toBe('3.0.3');
  });

  it('GET /api/openapi.yaml should return YAML spec', async () => {
    const response = await request(app).get('/api/openapi.yaml');
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/text\/yaml/);
    expect(response.text).toContain('openapi: 3.0.3');
  });

  it('GET /api/openapi should return JSON spec by default', async () => {
    const response = await request(app).get('/api/openapi');
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/application\/json/);
    expect(response.body.openapi).toBe('3.0.3');
  });

  it('GET /api/openapi?format=yaml should return YAML spec', async () => {
    const response = await request(app).get('/api/openapi?format=yaml');
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/text\/yaml/);
    expect(response.text).toContain('openapi: 3.0.3');
  });
});
