import express from 'express';
import request from 'supertest';
import { WebUIServer } from '../../src/server/server';
import { registerServices } from '../../src/di/registration';

// Mock authentication
jest.mock('../../src/server/middleware/auth', () => ({
  authenticateToken: (req: any, res: any, next: any) => {
    req.user = { id: 'test-user', role: 'admin' };
    next();
  },
  optionalAuth: (req: any, res: any, next: any) => {
    req.user = { id: 'test-user', role: 'admin' };
    next();
  },
  requirePermission: () => (req: any, res: any, next: any) => next(),
  requireRole: () => (req: any, res: any, next: any) => next()
}));

// Mock MetricsCollector to avoid background processing
jest.mock('../../src/monitoring/MetricsCollector', () => ({
  MetricsCollector: {
    getInstance: jest.fn().mockReturnValue({
      getMetrics: jest.fn().mockReturnValue({}),
      record: jest.fn(),
      incrementErrors: jest.fn()
    })
  }
}));

describe('Comprehensive API Integration', () => {
  let app: express.Application;

  beforeAll(() => {
    process.env.CSRF_SKIP_IN_TEST = 'true';
    registerServices();
    const server = new WebUIServer();
    app = server.getApp();
  });

  afterAll(() => {
    delete process.env.CSRF_SKIP_IN_TEST;
  });

  const routes = [
    { path: '/health', expectedStatus: 200 },
    { path: '/sitemap.xml', expectedStatus: 200 },
    { path: '/api/config/llm-status', expectedStatus: 200 },
    { path: '/api/health', expectedStatus: 200 },
  ];

  routes.forEach(({ path, expectedStatus }) => {
    it(`GET ${path} should respond correctly`, async () => {
      const res = await request(app).get(path);
      expect(res.status).toBe(expectedStatus);
    });
  });
});
