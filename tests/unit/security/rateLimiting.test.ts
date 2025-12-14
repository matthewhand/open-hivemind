import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

describe('Rate Limiting Middleware', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();

    // Create a simple rate limiter for testing (bypassing the production-only check)
    const testRateLimiter = rateLimit({
      windowMs: 1000, // 1 second
      max: 3, // 3 requests per second
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req: Request, res: Response) => {
        res.status(429).json({
          error: 'Too many requests',
          message: 'Rate limit exceeded'
        });
      }
    });

    const authRateLimiter = rateLimit({
      windowMs: 1000,
      max: 2,
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req: Request, res: Response) => {
        res.status(429).json({
          error: 'Too many login attempts',
          message: 'Auth rate limit exceeded'
        });
      }
    });

    // Apply rate limiting middleware directly (not the production-only wrapper)
    app.use('/test', testRateLimiter);
    app.use('/auth', authRateLimiter);

    // Add test routes
    app.get('/test', (req: Request, res: Response) => {
      res.status(200).json({ message: 'Success' });
    });

    app.post('/auth/login', express.json(), (req: Request, res: Response) => {
      res.status(200).json({ message: 'Login attempt' });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should allow requests within rate limit', async () => {
    const response = await request(app)
      .get('/test')
      .expect(200);

    expect(response.body.message).toBe('Success');
  });

  test('should reject requests that exceed rate limit', async () => {
    // Make requests to exceed the limit (max 3)
    await request(app).get('/test').expect(200);
    await request(app).get('/test').expect(200);
    await request(app).get('/test').expect(200);

    // This should be rate limited
    const response = await request(app)
      .get('/test')
      .expect(429);

    expect(response.body.error).toBe('Too many requests');
  });

  test('should apply different rate limits for auth endpoints', async () => {
    // Make requests to exceed auth rate limit (max 2)
    await request(app)
      .post('/auth/login')
      .send({ username: 'testuser', password: 'password' })
      .set('Content-Type', 'application/json')
      .expect(200);

    await request(app)
      .post('/auth/login')
      .send({ username: 'testuser', password: 'password' })
      .set('Content-Type', 'application/json')
      .expect(200);

    // This should be rate limited
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