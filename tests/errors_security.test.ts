
import request from 'supertest';
import express from 'express';
import { jest } from '@jest/globals';

// Define mocks before imports that use them
jest.mock('../src/server/middleware/auth', () => ({
  optionalAuth: (req, res, next) => next(),
  authenticateToken: (req, res, next) => {
     // Simulate auth failure for test
     res.status(401).json({ error: 'Access token required' });
  }
}));

jest.mock('../src/utils/errorLogger', () => {
    return {
        errorLogger: {
            getErrorStats: () => Promise.resolve({ count: 10 }),
            getRecentErrors: () => Promise.resolve([{ message: 'Secret error' }]),
            logError: () => Promise.resolve(true)
        }
    };
});

// Import the router after mocks
import errorsRouter from '../src/server/routes/errors';
import { optionalAuth } from '../src/server/middleware/auth';


describe('Security Check: /api/errors/recent', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    // Simulate the server setup where /api/errors uses optionalAuth
    app.use('/api/errors', optionalAuth, errorsRouter);
  });

  it('should deny unauthenticated access to sensitive error logs', async () => {
    const res = await request(app).get('/api/errors/recent');

    // If status is 401, the fix is working
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Access token required' });
  });

  it('should deny unauthenticated access to sensitive error stats', async () => {
    const res = await request(app).get('/api/errors/stats');

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Access token required' });
  });
});
