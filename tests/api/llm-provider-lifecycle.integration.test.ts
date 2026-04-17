import express from 'express';
import request from 'supertest';
import providersRouter from '@src/server/routes/providers';

describe('LLM Provider API Integration', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    // Mount on the expected path
    app.use('/api/providers', providersRouter);
  });

  it('should return a list of system LLM profiles', async () => {
    const res = await request(app)
      .get('/api/providers/profiles')
      .set('Origin', 'http://localhost:3000');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);

    // We should have some default profiles
    if (res.body.data.length > 0) {
      expect(res.body.data[0]).toHaveProperty('key');
      expect(res.body.data[0]).toHaveProperty('name');
    }
  });

  it('should return 404 for non-existent provider profile', async () => {
    const res = await request(app)
      .get('/api/providers/providers/non-existent-key-999')
      .set('Origin', 'http://localhost:3000');
    // If not found, should return 404
    expect(res.status).toBe(404);
  });
});
