import express from 'express';
import request from 'supertest';
import authRouter from '../../src/server/routes/auth';

// Mock dependencies
jest.mock('../../src/auth/AuthManager', () => {
  return {
    AuthManager: {
      getInstance: jest.fn().mockReturnValue({
        login: jest.fn(),
        register: jest.fn(),
        refreshToken: jest.fn(),
        logout: jest.fn(),
        verifyAccessToken: jest.fn(),
        getUser: jest.fn(),
        getUserWithHash: jest.fn(),
        verifyPassword: jest.fn(),
        changePassword: jest.fn(),
        getAllUsers: jest.fn(),
        updateUser: jest.fn(),
        deleteUser: jest.fn(),
        getUserPermissions: jest.fn(),
      }),
    },
  };
});

jest.mock('../../src/auth/middleware', () => {
  return {
    authenticate: (req: any, res: any, next: any) => {
      req.user = { id: 'test', username: 'test', role: 'admin' };
      next();
    },
    requireAdmin: (req: any, res: any, next: any) => {
      next();
    },
  };
});

jest.mock('../../src/middleware/rateLimiter', () => {
  return {
    authRateLimiter: (req: any, res: any, next: any) => next(),
  };
});

const app = express();
app.use(express.json());
app.use('/auth', authRouter);

describe('Auth Routes Zod Validation', () => {
  describe('POST /auth/login', () => {
    it('returns 400 with standardized error envelope for missing fields', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({ username: 'test' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body).toHaveProperty('code', 'VALIDATION_ERROR');
      // The issue message can be "Required" if no custom message for required was provided in zod string
      expect(response.body.data[0]).toHaveProperty('message');
    });
  });

  describe('POST /auth/register', () => {
    it('returns 400 for invalid username format', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          username: 'ab', // too short
          password: 'Password123!',
          email: 'test@example.com'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });
  });
});
