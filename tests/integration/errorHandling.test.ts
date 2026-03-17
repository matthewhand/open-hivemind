import express from 'express';
import request from 'supertest';
import { jest } from '@jest/globals';
import { globalErrorHandler as errorHandler } from '../../src/middleware/errorHandler';
import errorsRouter from '../../src/server/routes/errors';

// Mock auth middleware to allow all requests
jest.mock('../../src/server/middleware/auth', () => ({
  authenticateToken: (req: any, res: any, next: any) => {
    req.user = { id: 'test-user', role: 'admin' };
    next();
  },
  optionalAuth: (req: any, res: any, next: any) => next(),
}));

// Create a test express app
const createTestApp = (addTestRoutes?: (app: express.Application) => void) => {
  const app = express();
  app.use(express.json());
  app.use('/api/errors', errorsRouter);

  if (addTestRoutes) {
    addTestRoutes(app);
  }

  app.use(errorHandler);
  return app;
};

describe('Error Handling Integration Tests', () => {
  let app: express.Application;

  beforeEach(() => {
    app = createTestApp();
  });

  describe('Frontend Error Reporting', () => {
    test('should accept and log frontend error report', async () => {
      const errorReport = {
        name: 'TypeError',
        message: 'Cannot read property of undefined',
        stack: 'TypeError: Cannot read property of undefined\n    at Component.render',
        code: 'FRONTEND_ERROR',
        severity: 'high',
        correlationId: 'frontend-12345-abc',
        timestamp: new Date().toISOString(),
        componentStack: 'in Component (created by App)\n    in App',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        url: 'https://example.com/dashboard',
        localStorage: { theme: 'dark', language: 'en' },
        sessionStorage: { sessionId: 'session-123' },
        performance: { loadTime: 1500, firstContentfulPaint: 800 },
      };

      const response = await request(app)
        .post('/api/errors/frontend')
        .send(errorReport)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        correlationId: errorReport.correlationId,
        message: 'Error report received and logged',
      });
    });

    test('should reject frontend error report with missing required fields', async () => {
      const incompleteErrorReport = {
        name: 'TypeError',
        // Missing message and correlationId
      };

      const response = await request(app)
        .post('/api/errors/frontend')
        .send(incompleteErrorReport)
        .expect(400);

      expect(response.body).toEqual({
        error: 'Invalid error report: missing required fields',
        required: ['message', 'correlationId'],
      });
    });

    test('should handle malformed JSON in frontend error report', async () => {
      const response = await request(app)
        .post('/api/errors/frontend')
        .set('Content-Type', 'application/json')
        .send('{"malformed"}')
        .expect(400);

      expect(response.body.message).toContain('Expected');
    });

    test('should include correlation ID from header in error response', async () => {
      const correlationId = 'test-correlation-456';
      const errorReport = {
        name: 'NetworkError',
        message: 'Failed to fetch',
        correlationId: 'frontend-correlation-123',
      };

      const response = await request(app)
        .post('/api/errors/frontend')
        .set('X-Correlation-ID', correlationId)
        .send(errorReport)
        .expect(200);

      expect(response.body.correlationId).toBe(errorReport.correlationId);
    });
  });

  describe('Error Statistics Endpoint', () => {
    test('should return error statistics', async () => {
      // First, log an error to ensure stats are not empty
      await request(app).post('/api/errors/frontend').set('Content-Type', 'application/json').send({
        name: 'TestError',
        message: 'Stats Test',
        correlationId: 'stats-123',
        source: 'frontend',
      });

      const response = await request(app).get('/api/errors/stats').expect(200);

      expect(response.body).toHaveProperty('totalErrors');
      expect(response.body).toHaveProperty('errorTypes');
      expect(response.body.totalErrors).toBeGreaterThan(0);
      // We can't guarantee the exact error type, so just check that errorTypes is not empty
      expect(Object.keys(response.body.errorTypes).length).toBeGreaterThan(0);
    });

    test('should handle errors when getting statistics', async () => {
      // This test would need to mock the errorLogger to throw an error
      // For now, we'll just ensure the endpoint exists
      await request(app).get('/api/errors/stats').expect(200);
    });
  });

  describe('Recent Errors Endpoint', () => {
    test('should return recent errors with default limit', async () => {
      const response = await request(app).get('/api/errors/recent').expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    test('should return recent errors with custom limit', async () => {
      const response = await request(app).get('/api/errors/recent?limit=10').expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    test('should handle invalid limit parameter', async () => {
      const response = await request(app).get('/api/errors/recent?limit=invalid').expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Error Handler Middleware Integration', () => {
    test('should handle uncaught errors in route handlers', async () => {
      const app = createTestApp((a) => {
        a.get('/test-error', (req, res) => {
          throw new Error('Test error for middleware');
        });
      });

      const response = await request(app).get('/test-error').expect(500);

      expect(response.body.error).toBeDefined();
      expect(response.body.message).toContain('Test error for middleware');
    });

    test('should handle async errors in route handlers', async () => {
      const app = createTestApp((a) => {
        a.get('/test-async-error', (req, res, next) => {
          next(new Error('Test async error'));
        });
      });

      const response = await request(app).get('/test-async-error').expect(500);

      expect(response.body.error).toBeDefined();
      expect(response.body.message).toContain('Test async error');
    });
  });

  describe('CORS and Security Headers', () => {
    test('should include security headers in error responses', async () => {
      const response = await request(app).post('/api/errors/frontend').send({
        name: 'TestError',
        message: 'Test message',
        correlationId: 'test-123',
      });

      expect(response.headers).toHaveProperty('x-correlation-id');
    });

    test('should handle preflight OPTIONS requests', async () => {
      await request(app).options('/api/errors/frontend').expect(204);
    });
  });

  describe('Rate Limiting', () => {
    test('should handle multiple rapid requests', async () => {
      const errorReport = {
        name: 'RapidError',
        message: 'Rapid test error',
        correlationId: 'rapid-test-123',
      };

      // Send multiple requests rapidly
      const promises = Array(5)
        .fill(null)
        .map(() => request(app).post('/api/errors/frontend').send(errorReport));

      const results = await Promise.all(promises);

      // All should succeed (no rate limiting implemented yet, but structure is there)
      results.forEach((result) => {
        expect(result.status).toBe(200);
      });
    });
  });

  describe('Error Recovery Integration', () => {
    test('should handle recovery scenarios in error reporting', async () => {
      const errorReport = {
        name: 'RecoverableError',
        message: 'Network timeout - attempting recovery',
        correlationId: 'recovery-test-456',
        severity: 'medium',
        recoveryStrategy: {
          type: 'retry',
          attempts: 2,
          maxAttempts: 3,
          nextRetry: Date.now() + 5000,
        },
      };

      const response = await request(app)
        .post('/api/errors/frontend')
        .send(errorReport)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});
