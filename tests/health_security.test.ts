
import request from 'supertest';
import express from 'express';
import { jest } from '@jest/globals';

// Mock dependencies
jest.mock('../src/server/middleware/auth', () => ({
  optionalAuth: (req, res, next) => {
    // Basic mock: check for Authorization header "Bearer valid-token"
    if (req.headers.authorization === 'Bearer valid-token') {
      req.user = { id: 'user1', role: 'admin' };
    }
    next();
  },
  authenticateToken: (req, res, next) => next()
}));

// Mock MetricsCollector
jest.mock('../src/monitoring/MetricsCollector', () => ({
  MetricsCollector: {
    getInstance: () => ({
      getMetrics: () => ({
        errors: 0,
        messagesProcessed: 100,
        responseTime: [10, 20],
        llmTokenUsage: 500
      })
    })
  }
}));

// Mock ApiMonitorService
jest.mock('../src/services/ApiMonitorService', () => ({
  default: {
    getInstance: () => ({
      getAllStatuses: () => [],
      getOverallHealth: () => ({ status: 'healthy' })
    })
  }
}));

// Mock ErrorLogger
jest.mock('../src/utils/errorLogger', () => ({
  ErrorLogger: {
    getInstance: () => ({
      getErrorStats: () => ({}),
      getRecentErrorCount: () => 0
    })
  }
}));

// Mock globalRecoveryManager
jest.mock('../src/utils/errorRecovery', () => ({
  globalRecoveryManager: {
    getAllStats: () => ({})
  }
}));

import healthRouter from '../src/server/routes/health';
import { optionalAuth } from '../src/server/middleware/auth';

describe('Security Check: /health/detailed Information Exposure', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    // Simulate server.ts setup
    // Note: In the actual server.ts, /health currently does NOT have optionalAuth
    // We will verify that it leaks info, then apply the fix.
    // For the test setup, we will behave as the current code does.
    // Wait, I can't easily reproduce "server.ts behavior" without importing server.ts or replicating it.
    // But I can test the router behavior directly.
    // If I want to test the fix in the router, I need to pass optionalAuth to it in the test app
    // to simulate the "after fix" state where we WANT middleware to populate req.user,
    // OR we rely on the fact that if middleware is missing, req.user is undefined.

    // Scenario 1: Unauthenticated request (req.user is undefined)
    // We want to verify that system info IS returned (vulnerability)
    // and then AFTER fix it IS NOT returned.

    app.use('/health', optionalAuth, healthRouter);
  });

  it('should NOT return sensitive system information to unauthenticated users', async () => {
    const res = await request(app).get('/health/detailed');

    expect(res.status).toBe(200);
    // This expects the vulnerability to be fixed:
    expect(res.body.system).toBeUndefined();
    expect(res.body.memory).toBeUndefined();
    expect(res.body.cpu).toBeUndefined();

    // Public info should still be there
    expect(res.body.status).toBeDefined();
    expect(res.body.timestamp).toBeDefined();
  });

  it('should return system information to authenticated users', async () => {
     const res = await request(app)
      .get('/health/detailed')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body.system).toBeDefined();
    expect(res.body.system.nodeVersion).toBeDefined();
    expect(res.body.memory).toBeDefined();
    expect(res.body.cpu).toBeDefined();
  });
});
