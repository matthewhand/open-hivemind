import express from 'express';
import request from 'supertest';
import { correlationIdMiddleware, getCorrelationId } from '../../src/middleware/correlationId';

describe('Correlation ID Integration', () => {
  let app: express.Express;

  beforeEach(() => {
    app = express();
    app.use(correlationIdMiddleware);

    app.get('/test', (req, res) => {
      const id = getCorrelationId();
      res.json({ correlationId: id });
    });

    app.get('/nested', async (req, res) => {
      // Simulate an async operation that calls another function
      const result = await someAsyncWork();
      res.json({ correlationId: result });
    });
  });

  async function someAsyncWork(): Promise<string | undefined> {
    // This function doesn't receive 'req' but can still access correlationId
    return getCorrelationId();
  }

  it('should include correlation ID in response headers', async () => {
    const response = await request(app).get('/test');
    expect(response.headers['x-correlation-id']).toBeDefined();
    expect(response.headers['x-correlation-id']).toMatch(/^corr_/);
  });

  it('should use correlation ID from request header if provided', async () => {
    const customId = 'test-id-123';
    const response = await request(app).get('/test').set('X-Correlation-ID', customId);

    expect(response.headers['x-correlation-id']).toBe(customId);
    expect(response.body.correlationId).toBe(customId);
  });

  it('should use X-Request-ID as fallback for incoming correlation ID', async () => {
    const requestId = 'req-456';
    const response = await request(app).get('/test').set('X-Request-ID', requestId);

    expect(response.headers['x-correlation-id']).toBe(requestId);
  });

  it('should make correlation ID available in the async call stack', async () => {
    const response = await request(app).get('/nested');
    const id = response.headers['x-correlation-id'];
    expect(response.body.correlationId).toBe(id);
  });

  it('should maintain separate correlation IDs for concurrent requests', async () => {
    app.get('/delay', async (req, res) => {
      const idBefore = getCorrelationId();
      await new Promise((resolve) => setTimeout(resolve, 50));
      const idAfter = getCorrelationId();
      res.json({ idBefore, idAfter });
    });

    const [res1, res2] = await Promise.all([
      request(app).get('/delay').set('X-Correlation-ID', 'id-1'),
      request(app).get('/delay').set('X-Correlation-ID', 'id-2'),
    ]);

    expect(res1.body.idBefore).toBe('id-1');
    expect(res1.body.idAfter).toBe('id-1');
    expect(res2.body.idBefore).toBe('id-2');
    expect(res2.body.idAfter).toBe('id-2');
  });
});
