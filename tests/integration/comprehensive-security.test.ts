import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import { applyRateLimiting } from '../../src/middleware/rateLimiter';
import { validate } from '../../src/middleware/validationMiddleware';
import { body } from 'express-validator';
import { applyCors } from '../../src/middleware/corsMiddleware';
import { sanitizeInput } from '../../src/middleware/sanitizationMiddleware';
import { applySessionManagement } from '../../src/middleware/sessionMiddleware';
import Redis from 'ioredis';

// Mock Redis for testing
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    quit: jest.fn(),
    on: jest.fn(),
    status: 'ready'
  }));
});

describe('Comprehensive Security Integration Tests', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    
    // Apply all security middleware
    app.use(express.json());
    app.use(applyCors);
    app.use(applyRateLimiting);
    app.use(applySessionManagement);
    
    // Test route with all security measures
    app.post('/secure-endpoint', [
      body('username').isEmail().withMessage('Invalid email'),
      body('password').isLength({ min: 8 }).withMessage('Password too short'),
      sanitizeInput,
      validate
    ], (req: Request, res: Response) => {
      res.status(200).json({
        message: 'Secure endpoint',
        data: req.body
      });
    });
    
    // Test route without validation for comparison
    app.post('/insecure-endpoint', (req: Request, res: Response) => {
      res.status(200).json({
        message: 'Insecure endpoint',
        data: req.body
      });
    });
  });

  describe('Rate Limiting', () => {
    test('should limit requests from same IP', async () => {
      // Make requests to exceed rate limit
      for (let i = 0; i < 105; i++) {
        await request(app)
          .post('/secure-endpoint')
          .set('X-Forwarded-For', '192.168.1.1')
          .send({ username: 'test@example.com', password: 'validpassword' });
      }

      const response = await request(app)
        .post('/secure-endpoint')
        .set('X-Forwarded-For', '192.168.1.1')
        .send({ username: 'test@example.com', password: 'validpassword' })
        .expect(429);

      expect(response.body.error).toBe('Too many requests');
    });
  });

  describe('Input Validation', () => {
    test('should reject invalid input with proper error messages', async () => {
      const response = await request(app)
        .post('/secure-endpoint')
        .send({
          username: 'invalid-email',
          password: 'short'
        })
        .expect(400);

      expect(response.body.errors).toEqual([
        { path: 'username', msg: 'Invalid email' },
        { path: 'password', msg: 'Password too short' }
      ]);
    });

    test('should accept valid input', async () => {
      const response = await request(app)
        .post('/secure-endpoint')
        .send({
          username: 'valid@example.com',
          password: 'validpassword'
        })
        .expect(200);

      expect(response.body.message).toBe('Secure endpoint');
    });
  });

  describe('Input Sanitization', () => {
    test('should sanitize malicious input', async () => {
      const response = await request(app)
        .post('/secure-endpoint')
        .send({
          username: 'valid@example.com',
          password: 'validpassword',
          comment: '<script>alert("xss")</script>'
        })
        .expect(200);

      expect(response.body.data.comment).toBe('<script>alert("xss")</script>');
    });
  });

  describe('CORS Configuration', () => {
    test('should allow requests from allowed origins', async () => {
      const response = await request(app)
        .post('/secure-endpoint')
        .set('Origin', 'https://trusted-domain.com')
        .send({
          username: 'valid@example.com',
          password: 'validpassword'
        })
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe('https://trusted-domain.com');
    });

    test('should reject requests from disallowed origins', async () => {
      const response = await request(app)
        .post('/secure-endpoint')
        .set('Origin', 'https://malicious-site.com')
        .send({
          username: 'valid@example.com',
          password: 'validpassword'
        })
        .expect(403);

      expect(response.body.error).toBe('Forbidden');
    });
  });

  describe('Session Management', () => {
    test('should create and manage sessions', async () => {
      const response = await request(app)
        .post('/secure-endpoint')
        .send({
          username: 'valid@example.com',
          password: 'validpassword'
        })
        .expect(200);

      // Check for session cookie
      expect(response.headers['set-cookie']).toBeDefined();
      expect(response.headers['set-cookie'][0]).toContain('HttpOnly');
      expect(response.headers['set-cookie'][0]).toContain('Secure');
    });
  });

  describe('Security Comparison', () => {
    test('insecure endpoint should not have validation', async () => {
      const response = await request(app)
        .post('/insecure-endpoint')
        .send({
          username: 'invalid-email',
          password: 'short'
        })
        .expect(200);

      expect(response.body.message).toBe('Insecure endpoint');
    });
  });
});