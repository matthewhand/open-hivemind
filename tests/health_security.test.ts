import express from 'express';
import request from 'supertest';
import { jest } from '@jest/globals';
import healthRouter from '../src/server/routes/health';

// Mock auth middleware before importing the router
jest.mock('../src/server/middleware/auth', () => ({
  optionalAuth: (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      if (token === 'valid-token') {
        req.user = { userId: 'test-user', role: 'admin' };
      }
    }
    next();
  },
}));

describe('Security Check: /health/detailed Information Disclosure', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.disable('x-powered-by');
    app.set('case sensitive routing', true);
    app.set('strict routing', true);
    app.use('/health', healthRouter);
  });

  describe('Unauthenticated requests', () => {
    it('should return sanitized data without sensitive system information', async () => {
      const res = await request(app).get('/health/detailed');

      expect(res.status).toBe(200);
      // Should only have basic fields
      expect(res.body).toHaveProperty('status');
      expect(res.body).toHaveProperty('timestamp');
      expect(res.body).toHaveProperty('uptime');

      // Should NOT have sensitive system details
      expect(res.body).not.toHaveProperty('system');
      expect(res.body).not.toHaveProperty('cpu');
      expect(res.body).not.toHaveProperty('memory');
      expect(res.body).not.toHaveProperty('errors');
      expect(res.body).not.toHaveProperty('recovery');
      expect(res.body).not.toHaveProperty('performance');
      expect(res.body).not.toHaveProperty('checks');
    });

    it('should not expose hostname to unauthenticated users', async () => {
      const res = await request(app).get('/health/detailed');
      expect(res.body.system?.hostname).toBeUndefined();
    });

    it('should not expose OS release version to unauthenticated users', async () => {
      const res = await request(app).get('/health/detailed');
      expect(res.body.system?.release).toBeUndefined();
    });

    it('should not expose error statistics to unauthenticated users', async () => {
      const res = await request(app).get('/health/detailed');
      expect(res.body.errors).toBeUndefined();
    });

    it('should not expose recovery stats to unauthenticated users', async () => {
      const res = await request(app).get('/health/detailed');
      expect(res.body.recovery).toBeUndefined();
    });
  });

  describe('Authenticated requests', () => {
    it('should return full detailed data for authenticated users', async () => {
      const res = await request(app)
        .get('/health/detailed')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      // Should have all fields including sensitive ones
      expect(res.body).toHaveProperty('status');
      expect(res.body).toHaveProperty('timestamp');
      expect(res.body).toHaveProperty('uptime');
      expect(res.body).toHaveProperty('checks');
      expect(res.body).toHaveProperty('memory');
      expect(res.body).toHaveProperty('cpu');
      expect(res.body).toHaveProperty('system');
      expect(res.body).toHaveProperty('errors');
      expect(res.body).toHaveProperty('recovery');
      expect(res.body).toHaveProperty('performance');
    });

    it('should expose system details to authenticated users', async () => {
      const res = await request(app)
        .get('/health/detailed')
        .set('Authorization', 'Bearer valid-token');

      expect(res.body.system).toHaveProperty('platform');
      expect(res.body.system).toHaveProperty('arch');
      expect(res.body.system).toHaveProperty('release');
      expect(res.body.system).toHaveProperty('hostname');
      expect(res.body.system).toHaveProperty('loadAverage');
      expect(res.body.system).toHaveProperty('nodeVersion');
    });

    it('should expose memory details to authenticated users', async () => {
      const res = await request(app)
        .get('/health/detailed')
        .set('Authorization', 'Bearer valid-token');

      expect(res.body.memory).toHaveProperty('used');
      expect(res.body.memory).toHaveProperty('total');
      expect(res.body.memory).toHaveProperty('usage');
    });

    it('should expose error stats to authenticated users', async () => {
      const res = await request(app)
        .get('/health/detailed')
        .set('Authorization', 'Bearer valid-token');

      expect(res.body.errors).toHaveProperty('total');
      expect(res.body.errors).toHaveProperty('recent');
      expect(res.body.errors).toHaveProperty('rate');
      expect(res.body.errors).toHaveProperty('byType');
    });

    it('should expose recovery stats to authenticated users', async () => {
      const res = await request(app)
        .get('/health/detailed')
        .set('Authorization', 'Bearer valid-token');

      expect(res.body.recovery).toHaveProperty('circuitBreakers');
      expect(res.body.recovery).toHaveProperty('activeFallbacks');
      expect(res.body.recovery).toHaveProperty('stats');
    });
  });

  describe('Invalid authentication', () => {
    it('should return sanitized data for invalid tokens', async () => {
      const res = await request(app)
        .get('/health/detailed')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(200);
      // Should be sanitized since token is invalid
      expect(res.body).not.toHaveProperty('system');
      expect(res.body).not.toHaveProperty('errors');
      expect(res.body).not.toHaveProperty('recovery');
    });

    it('should return sanitized data when no authorization header provided', async () => {
      const res = await request(app).get('/health/detailed');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status');
      expect(res.body).toHaveProperty('timestamp');
      expect(res.body).toHaveProperty('uptime');
      expect(res.body).not.toHaveProperty('system');
    });
  });
});
