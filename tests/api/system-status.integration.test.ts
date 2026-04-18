import express from 'express';
import request from 'supertest';
import healthRouter from '../../src/server/routes/health';
import sitemapRouter from '../../src/server/routes/sitemap';
import configRouter from '../../src/server/routes/config';
import { DatabaseManager } from '../../src/database/DatabaseManager';
import { MetricsCollector } from '../../src/monitoring/MetricsCollector';

// Mock optionalAuth middleware
jest.mock('../../src/server/middleware/auth', () => ({
  optionalAuth: (req: any, res: any, next: any) => {
    req.user = { id: 'test-user', role: 'admin' };
    next();
  },
  authenticateToken: (req: any, res: any, next: any) => {
    req.user = { id: 'test-user', role: 'admin' };
    next();
  }
}));

// Mock DatabaseManager
jest.mock('../../src/database/DatabaseManager', () => ({
  DatabaseManager: {
    getInstance: jest.fn().mockReturnValue({
      isConnected: jest.fn().mockReturnValue(true),
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined)
    })
  }
}));

// Mock MetricsCollector
jest.mock('../../src/monitoring/MetricsCollector', () => ({
  MetricsCollector: {
    getInstance: jest.fn().mockReturnValue({
      getMetrics: jest.fn().mockReturnValue({
        uptime: 100000, // > 60 seconds to be healthy
        errors: 0,
        messagesProcessed: 0,
        responseTime: [],
        llmTokenUsage: 0
      })
    })
  }
}));

// Mock process.memoryUsage
const originalMemoryUsage = process.memoryUsage;
beforeAll(() => {
  process.memoryUsage = jest.fn().mockReturnValue({
    heapUsed: 100,
    heapTotal: 1000,
    external: 0,
    rss: 1000,
    arrayBuffers: 0
  });
});

afterAll(() => {
  process.memoryUsage = originalMemoryUsage;
});

describe('System Status API Integration', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/health', healthRouter);
    app.use('/', sitemapRouter);
    app.use('/api/config', configRouter);
  });

  describe('Health Endpoints', () => {
    it('should return basic health status from real service logic', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
      expect(res.body).toHaveProperty('timestamp');
    });

    it('should return detailed health with memory/system info', async () => {
      const res = await request(app).get('/health/detailed');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
      expect(res.body).toHaveProperty('memory');
      expect(res.body.memory).toHaveProperty('used');
      expect(res.body).toHaveProperty('system');
    });
  });

  describe('Sitemap Endpoints', () => {
    it('should generate real sitemap JSON with current routes', async () => {
      const res = await request(app).get('/sitemap.json');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.urls)).toBe(true);
      // Should at least contain some of our core routes
      const urls = res.body.data.urls.map((u: any) => u.url);
      expect(urls).toContain('/admin');
    });
  });

  describe('Config Status Endpoints', () => {
    it('should return real LLM status based on current provider config', async () => {
      const res = await request(app).get('/api/config/llm-status');
      // If no providers are configured in test env, it might be 200 with empty providers
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('configured');
      expect(Array.isArray(res.body.providers)).toBe(true);
    });
  });
});
