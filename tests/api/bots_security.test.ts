
import express from 'express';
import request from 'supertest';
import botsRouter from '../../src/server/routes/bots';

// We mock BotManager to avoid it trying to connect to real things
jest.mock('../../src/managers/BotManager', () => ({
  BotManager: {
    getInstance: () => ({
      getAllBots: jest.fn().mockResolvedValue([]),
    }),
  },
}));

// We mock audit middleware to avoid it crashing or logging
jest.mock('../../src/server/middleware/audit', () => ({
  auditMiddleware: (req, res, next) => next(),
}));

// We DO NOT mock authenticateToken here, so the real implementation is used.
// However, authenticateToken uses AuthManager, so we might need to mock AuthManager
// if it's called.
// But wait, authenticateToken imports AuthManager.
// If we don't provide a token, authenticateToken checks the header and returns 401 BEFORE calling AuthManager.
// So we don't need to mock AuthManager for the "missing token" case.

describe('Bots API Security', () => {
  it('should reject unauthenticated requests with 401', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/bots', botsRouter);

    // No auth header provided
    const response = await request(app).get('/api/bots');

    expect(response.status).toBe(401);
  });
});
