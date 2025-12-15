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

import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { validate } from '../../src/middleware/validationMiddleware';
import { body } from 'express-validator';
import { applyCors } from '../../src/middleware/corsMiddleware';
import { sanitizeInput } from '../../src/middleware/sanitizationMiddleware';
import { applySessionManagement } from '../../src/middleware/sessionMiddleware';
import Redis from 'ioredis';

describe('Comprehensive Security Integration Tests', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.set('trust proxy', 1); // Trust X-Forwarded-For headers

    // Apply all security middleware
    app.use(express.json());
    app.use(applyCors);
    app.use(applySessionManagement);

    // Test route with all security measures
    app.post('/secure-endpoint', [
      body('username').isEmail().withMessage('Invalid email'),
      body('password').isLength({ min: 8 }).withMessage('Password too short'),
      sanitizeInput,
      validate
    ], (req: Request, res: Response) => {
      // Set session data to ensure cookie is sent
      if (req.session) {
        (req.session as any).user = 'test-user';
      }
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
      // Create a dedicated test app with low-threshold rate limiter
      const testApp = express();
      testApp.set('trust proxy', 1);
      testApp.use(express.json());

      // Use a very low limit for testing (5 requests)
      const testRateLimiter = rateLimit({
        windowMs: 60 * 1000,
        max: 5,
        keyGenerator: (req) => req.ip || 'unknown',
        handler: (req, res) => {
          res.status(429).json({ error: 'Too many requests' });
        }
      });

      testApp.use(testRateLimiter);
      testApp.post('/test-rate-limit', (req, res) => {
        res.status(200).json({ success: true });
      });

      // Make 5 requests (at limit)
      for (let i = 0; i < 5; i++) {
        await request(testApp)
          .post('/test-rate-limit')
          .set('X-Forwarded-For', '10.0.0.1')
          .send({});
      }

      // 6th request should be rate limited
      const response = await request(testApp)
        .post('/test-rate-limit')
        .set('X-Forwarded-For', '10.0.0.1')
        .send({})
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

      expect(response.body.errors).toEqual(expect.arrayContaining([
        expect.objectContaining({ path: 'username', msg: 'Invalid email' }),
        expect.objectContaining({ path: 'password', msg: 'Password too short' })
      ]));
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

      expect(response.body.data.comment).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
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
      expect(response.headers['set-cookie'][0]).toContain('HttpOnly');
      if (process.env.NODE_ENV === 'production') {
        expect(response.headers['set-cookie'][0]).toContain('Secure');
      }
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