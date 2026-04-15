import express from 'express';
import request from 'supertest';
import { llmProfilesRouter } from '../../src/server/routes/llmProfiles';

describe('LLM Provider API Integration', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    // Mount on the expected path
    app.use('/api/admin/llm-providers', llmProfilesRouter);
  });

  it('should return a list of system LLM profiles', async () => {
    const res = await request(app).get('/api/admin/llm-providers/profiles');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    
    // We should have some default profiles
    if (res.body.data.length > 0) {
      expect(res.body.data[0]).toHaveProperty('key');
      expect(res.body.data[0]).toHaveProperty('name');
    }
  });

  it('should return 404 for non-existent provider profile', async () => {
    const res = await request(app).get('/api/admin/llm-providers/providers/non-existent-key-999');
    // If not found, should return 404
    expect(res.status).toBe(404);
  });
});
