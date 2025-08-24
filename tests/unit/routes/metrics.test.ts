import request from 'supertest';
import express from 'express';
import metricsRouter from '@src/routes/metrics';

const app = express();
app.use('/', metricsRouter);

describe('Metrics Routes', () => {
  test('GET /metrics returns Prometheus format', async () => {
    const response = await request(app)
      .get('/metrics')
      .expect(200);
    
    expect(response.headers['content-type']).toContain('text/plain');
    expect(response.text).toContain('hivemind_messages_total');
  });
});