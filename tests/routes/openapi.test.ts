import express from 'express';
import request from 'supertest';
import openapiRouter from '../../src/server/routes/openapi';

describe('OpenAPI route', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use('/api', openapiRouter);
  });

  it('returns JSON spec by default at /api/openapi', async () => {
    const response = await request(app).get('/api/openapi');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/application\/json/);
    expect(response.body.openapi).toBe('3.0.3');
    expect(response.body.paths).toHaveProperty('/webui/api/config');
  });

  it('returns JSON spec at /api/openapi.json', async () => {
    const response = await request(app).get('/api/openapi.json');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/application\/json/);
    expect(response.body.openapi).toBe('3.0.3');
  });

  it('returns YAML when requested via query param', async () => {
    const response = await request(app).get('/api/openapi?format=yaml');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/text\/yaml/);
    expect(response.text).toContain('openapi: 3.0.3');
    expect(response.text).toContain('/webui/api/config:');
  });

  it('returns YAML when requested via extension .yaml', async () => {
    const response = await request(app).get('/api/openapi.yaml');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/text\/yaml/);
    expect(response.text).toContain('openapi: 3.0.3');
  });
});
