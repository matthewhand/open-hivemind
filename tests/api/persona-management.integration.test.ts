import express from 'express';
import request from 'supertest';
import personasRouter from '../../src/server/routes/personas';
import { PersonaManager } from '../../src/managers/PersonaManager';

describe('Persona Management Integration', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/personas', personasRouter);
  });

  it('should return a list containing at least default personas', async () => {
    const res = await request(app).get('/api/personas');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    
    // Core check: do we have the 'default' and 'professional' personas?
    const keys = res.body.map((p: any) => p.key);
    expect(keys).toContain('default');
    expect(keys).toContain('professional');
  });

  it('should return 404 for non-existent persona', async () => {
    const res = await request(app).get('/api/personas/non-existent-persona-12345');
    expect(res.status).toBe(404);
  });
});
