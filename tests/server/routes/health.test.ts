import express from 'express';
import request from 'supertest';
import healthRouter from '../../../src/server/routes/health';

describe('Health Router', () => {
  let app: express.Express;

  beforeEach(() => {
    app = express();
    app.use('/health', healthRouter);
  });

  it('GET /health/errors should return JSON content with correct structure', async () => {
    const res = await request(app).get('/health/errors');
    expect(res.status).toBe(200);
    expect(res.header['content-type']).toContain('application/json');
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors.total).toBeDefined();
    // Verify bug fix: byType should be an object (map), not the full stats object
    expect(res.body.errors.byType).toBeDefined();
    expect(typeof res.body.errors.byType).toBe('object');
    // Ensure it doesn't contain nested 'errorTypes' property which would indicate the bug
    expect(res.body.errors.byType.errorTypes).toBeUndefined();

    expect(res.body.health).toBeDefined();
    expect(res.body.health.status).toBeDefined();
  });

  it('GET /health/recovery should return JSON content with correct structure', async () => {
    const res = await request(app).get('/health/recovery');
    expect(res.status).toBe(200);
    expect(res.header['content-type']).toContain('application/json');
    expect(res.body.circuitBreakers).toBeDefined();
    expect(Array.isArray(res.body.circuitBreakers)).toBe(true);
    expect(res.body.health).toBeDefined();
    expect(res.body.health.status).toBeDefined();
  });
});
