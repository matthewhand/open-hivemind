import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import { applyRateLimiting } from '../../../src/middleware/rateLimiter';
import Redis from 'ioredis';

// Mock Redis connection for testing
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

describe('Rate Limiting Middleware', () => {
  let app: express.Application;
  let redisMock: jest.Mocked<Redis>;

  beforeEach(() => {
    app = express();
    
    // Apply rate limiting middleware
    app.use(applyRateLimiting);
    
    // Add a test route
    app.get('/test', (req: Request, res: Response) => {
      res.status(200).json({ message: 'Success' });
    });

    // Initialize mock Redis
    redisMock = new (require('ioredis'))() as jest.Mocked<Redis>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should allow requests within rate limit', async () => {
    const response = await request(app)
      .get('/test')
      .set('X-Forwarded-For', '192.168.1.1')
      .expect(200);
    
    expect(response.body.message).toBe('Success');
  });

  test('should reject requests that exceed rate limit', async () => {
    // Make multiple requests to exceed the limit
    for (let i = 0; i < 105; i++) {
      await request(app)
        .get('/test')
        .set('X-Forwarded-For', '192.168.1.1');
    }

    const response = await request(app)
      .get('/test')
      .set('X-Forwarded-For', '192.168.1.1')
      .expect(429);
    
    expect(response.body.error).toBe('Too many requests');
  });

  test('should apply different rate limits for auth endpoints', async () => {
    // Add auth route to test
    app.post('/auth/login', (req: Request, res: Response) => {
      res.status(200).json({ message: 'Login attempt' });
    });

    // Make multiple login attempts to exceed auth rate limit
    for (let i = 0; i < 6; i++) {
      await request(app)
        .post('/auth/login')
        .send({ username: 'testuser', password: 'password' })
        .set('Content-Type', 'application/json');
    }

    const response = await request(app)
      .post('/auth/login')
      .send({ username: 'testuser', password: 'password' })
      .set('Content-Type', 'application/json')
      .expect(429);
    
    expect(response.body.error).toBe('Too many login attempts');
  });

  test('should handle multiple IPs independently', async () => {
    // Test that different IPs have separate rate limits
    const ip1Response = await request(app)
      .get('/test')
      .set('X-Forwarded-For', '192.168.1.1')
      .expect(200);

    const ip2Response = await request(app)
      .get('/test')
      .set('X-Forwarded-For', '192.168.1.2')
      .expect(200);

    expect(ip1Response.status).toBe(200);
    expect(ip2Response.status).toBe(200);
  });
});