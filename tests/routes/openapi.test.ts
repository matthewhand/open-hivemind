import express from 'express';
import request from 'supertest';
import openapiRouter from '../../src/webui/routes/openapi';

describe('OpenAPI route', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use('/webui', openapiRouter);
  });

  it('returns JSON spec by default', async () => {
    const response = await request(app).get('/webui/api/openapi');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/application\/json/);
    expect(response.body.openapi).toBe('3.0.3');
    expect(response.body.paths).toHaveProperty('/webui/api/config');
  });

  it('returns YAML when requested', async () => {
    const response = await request(app).get('/webui/api/openapi?format=yaml');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/text\/yaml/);
    expect(response.text).toContain('openapi: 3.0.3');
    expect(response.text).toContain('/webui/api/config:');
  });
});
