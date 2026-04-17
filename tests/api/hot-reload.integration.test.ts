import express from 'express';
import request from 'supertest';
import { HotReloadManager } from '../../src/config/HotReloadManager';
import hotReloadRouter from '../../src/server/routes/hotReload';

describe('Hot Reload API Integration', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/hot-reload', hotReloadRouter);
  });

  it('should validate hot reload requests using real schema', async () => {
    // Missing required fields
    const res = await request(app)
      .post('/api/hot-reload')
      .set('Origin', 'http://localhost:3000')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Validation failed');
  });

  it('should reject hot reload with empty changes', async () => {
    const res = await request(app)
      .post('/api/hot-reload')
      .set('Origin', 'http://localhost:3000')
      .send({
        type: 'update',
        botName: 'test-bot',
        changes: {},
      });

    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toContain('At least one change');
  });

  it('should return history from real manager', async () => {
    const res = await request(app)
      .get('/api/hot-reload/history')
      .set('Origin', 'http://localhost:3000');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
