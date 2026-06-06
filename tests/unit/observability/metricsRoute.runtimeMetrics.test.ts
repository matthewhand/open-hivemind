import express from 'express';
import request from 'supertest';
import metricsRouter from '@src/server/routes/health/metrics';
import {
  __resetRuntimeMetricsForTests,
  requestCounterMiddleware,
} from '@src/server/routes/health/runtimeMetrics';

/**
 * Verifies the JSON `/metrics` endpoint reports real runtime values for the
 * event loop and request counter rather than the previously hardcoded zeros.
 */
describe('GET /metrics runtime metrics wiring', () => {
  const app = express();
  app.use(requestCounterMiddleware);
  app.use('/metrics', metricsRouter);

  beforeEach(() => {
    __resetRuntimeMetricsForTests();
  });

  it('counts requests and exposes a non-zero total and rate', async () => {
    // Make a couple of warm-up requests so the counter is clearly non-zero.
    await request(app).get('/metrics');
    await request(app).get('/metrics');

    const res = await request(app).get('/metrics');

    expect(res.status).toBe(200);
    expect(res.body.requests.total).toBe(3);
    expect(res.body.requests.rate).toBeGreaterThan(0);
  });

  it('reports event loop metrics as finite numbers', async () => {
    const res = await request(app).get('/metrics');

    expect(res.status).toBe(200);
    expect(typeof res.body.eventLoop.delay).toBe('number');
    expect(Number.isFinite(res.body.eventLoop.delay)).toBe(true);
    expect(res.body.eventLoop.delay).toBeGreaterThanOrEqual(0);

    expect(typeof res.body.eventLoop.utilization).toBe('number');
    expect(Number.isFinite(res.body.eventLoop.utilization)).toBe(true);
    expect(res.body.eventLoop.utilization).toBeGreaterThanOrEqual(0);
    expect(res.body.eventLoop.utilization).toBeLessThanOrEqual(1);
  });
});
