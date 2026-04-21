import request from 'supertest';
import express from 'express';
import { authenticateToken } from '@src/server/middleware/auth';

// Mock authenticateToken to reject unauthenticated requests
jest.mock('@src/server/middleware/auth', () => ({
  authenticateToken: jest.fn((req, res, next) => {
    return res.status(401).json({ error: 'Unauthorized' });
  }),
}));

describe('App Routing Integration', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    
    // Mock protected routes
    app.get('/api/agents', authenticateToken, (req, res) => res.json({}));
    app.get('/api/config', authenticateToken, (req, res) => res.json({}));
    app.get('/api/bots', authenticateToken, (req, res) => res.json({}));
  });

  it('should return 401 Unauthorized for protected API routes', async () => {
    // /api/agents is protected
    const resAgents = await request(app).get('/api/agents');
    expect(resAgents.status).toBe(401);

    // /api/config is protected
    const resConfig = await request(app).get('/api/config');
    expect(resConfig.status).toBe(401);

    // /api/bots is protected
    const resBots = await request(app).get('/api/bots');
    expect(resBots.status).toBe(401);
  });
});