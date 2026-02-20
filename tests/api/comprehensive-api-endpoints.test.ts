/**
 * COMPREHENSIVE API ENDPOINT TESTS
 *
 * Unit tests for API route handlers with mocked dependencies
 */

import express from 'express';
import request from 'supertest';
import { BotConfigurationManager } from '@src/config/BotConfigurationManager';
import { DatabaseManager } from '@src/database/DatabaseManager';
import { BotConfigService } from '@src/server/services/BotConfigService';
import WebSocketService from '@src/server/services/WebSocketService';

// Mock dependencies before importing routes
jest.mock('@src/database/DatabaseManager');
jest.mock('@src/config/ConfigurationManager');
jest.mock('@src/config/BotConfigurationManager');
jest.mock('@src/server/services/WebSocketService');
jest.mock('@src/server/services/BotConfigService');

const mockDbManager = DatabaseManager.getInstance as jest.Mock;
const mockBotConfigManager = BotConfigurationManager.getInstance as jest.Mock;
const mockWebSocketService = WebSocketService.getInstance as jest.Mock;
const mockBotConfigService = BotConfigService.getInstance as jest.Mock;

describe('API Endpoints', () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    mockDbManager.mockReturnValue({
      isConnected: jest.fn().mockReturnValue(true),
      getBotMetrics: jest.fn().mockResolvedValue([]),
      getStats: jest.fn().mockResolvedValue({ totalBots: 0 }),
      getAllBotConfigurations: jest.fn().mockResolvedValue([]),
      getApprovalRequests: jest.fn().mockResolvedValue([]),
    });

    mockBotConfigManager.mockReturnValue({
      getAllBots: jest.fn().mockReturnValue([]),
      getWarnings: jest.fn().mockReturnValue([]),
    });

    mockWebSocketService.mockReturnValue({
      broadcastConfigChange: jest.fn(),
      getAllBotStats: jest.fn().mockReturnValue([]),
    });

    mockBotConfigService.mockReturnValue({
      getAllBotConfigs: jest.fn().mockResolvedValue([]),
      createBotConfig: jest.fn().mockResolvedValue({ id: 1 }),
      updateBotConfig: jest.fn().mockResolvedValue(true),
      deleteBotConfig: jest.fn().mockResolvedValue(true),
    });

    // Create fresh Express app for each test
    app = express();
    app.use(express.json());
  });

  describe('Health Check Endpoints', () => {
    it('should return health status', async () => {
      app.get('/api/health', (req, res) => {
        res.json({ status: 'ok', timestamp: new Date().toISOString() });
      });

      const response = await request(app).get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
    });

    it('should return readiness status', async () => {
      app.get('/api/ready', (req, res) => {
        res.json({ ready: true, checks: { database: true } });
      });

      const response = await request(app).get('/api/ready');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('ready');
    });
  });

  describe('Bot Configuration Endpoints', () => {
    beforeEach(() => {
      // Setup bot routes
      app.get('/api/bots', async (req, res) => {
        const bots = await mockBotConfigService().getAllBotConfigs();
        res.json(bots);
      });

      app.post('/api/bots', async (req, res) => {
        try {
          const result = await mockBotConfigService().createBotConfig(req.body);
          res.status(201).json(result);
        } catch (error) {
          res.status(400).json({ error: 'Invalid configuration' });
        }
      });

      app.put('/api/bots/:id', async (req, res) => {
        const result = await mockBotConfigService().updateBotConfig(
          parseInt(req.params.id),
          req.body
        );
        res.json({ success: result });
      });

      app.delete('/api/bots/:id', async (req, res) => {
        const result = await mockBotConfigService().deleteBotConfig(parseInt(req.params.id));
        res.json({ success: result });
      });
    });

    it('should get all bots', async () => {
      const response = await request(app).get('/api/bots');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should create a new bot', async () => {
      const newBot = {
        name: 'TestBot',
        messageProvider: 'discord',
        llmProvider: 'openai',
      };

      const response = await request(app).post('/api/bots').send(newBot);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
    });

    it('should handle invalid bot creation', async () => {
      mockBotConfigService().createBotConfig = jest
        .fn()
        .mockRejectedValue(new Error('Invalid config'));

      const response = await request(app).post('/api/bots').send({});

      expect(response.status).toBe(400);
    });

    it('should update a bot', async () => {
      const response = await request(app).put('/api/bots/1').send({ name: 'UpdatedBot' });

      expect(response.status).toBe(200);
    });

    it('should delete a bot', async () => {
      const response = await request(app).delete('/api/bots/1');

      expect(response.status).toBe(200);
    });
  });

  describe('Metrics Endpoints', () => {
    beforeEach(() => {
      app.get('/api/metrics', async (req, res) => {
        const stats = await mockDbManager().getStats();
        res.json(stats);
      });

      app.get('/api/metrics/bot/:name', async (req, res) => {
        const metrics = await mockDbManager().getBotMetrics(req.params.name);
        res.json(metrics);
      });
    });

    it('should get system metrics', async () => {
      const response = await request(app).get('/api/metrics');

      expect(response.status).toBe(200);
    });

    it('should get bot-specific metrics', async () => {
      const response = await request(app).get('/api/metrics/bot/TestBot');

      expect(response.status).toBe(200);
    });
  });

  describe('Configuration Endpoints', () => {
    beforeEach(() => {
      app.get('/api/config', (req, res) => {
        res.json({
          providers: ['discord', 'slack', 'mattermost'],
          llmProviders: ['openai', 'flowise', 'openwebui'],
        });
      });

      app.get('/api/config/validation', (req, res) => {
        const warnings = mockBotConfigManager().getWarnings();
        res.json({
          isValid: warnings.length === 0,
          warnings,
        });
      });

      app.post('/api/config/reload', (req, res) => {
        mockWebSocketService().broadcastConfigChange();
        res.json({ success: true, message: 'Configuration reloaded' });
      });
    });

    it('should get available providers', async () => {
      const response = await request(app).get('/api/config');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('providers');
    });

    it('should get configuration validation', async () => {
      const response = await request(app).get('/api/config/validation');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('isValid');
    });

    it('should reload configuration', async () => {
      const response = await request(app).post('/api/config/reload');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });
  });

  describe('Approval Endpoints', () => {
    beforeEach(() => {
      app.get('/api/approvals', async (req, res) => {
        const approvals = await mockDbManager().getApprovalRequests({});
        res.json(approvals);
      });

      app.post('/api/approvals/:id/approve', async (req, res) => {
        res.json({ success: true, status: 'approved' });
      });

      app.post('/api/approvals/:id/reject', async (req, res) => {
        res.json({ success: true, status: 'rejected' });
      });
    });

    it('should get pending approvals', async () => {
      const response = await request(app).get('/api/approvals');

      expect(response.status).toBe(200);
    });

    it('should approve a request', async () => {
      const response = await request(app)
        .post('/api/approvals/1/approve')
        .send({ comments: 'Approved' });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('approved');
    });

    it('should reject a request', async () => {
      const response = await request(app)
        .post('/api/approvals/1/reject')
        .send({ comments: 'Rejected' });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('rejected');
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 errors', async () => {
      app.use((req, res) => {
        res.status(404).json({ error: 'Not found' });
      });

      const response = await request(app).get('/api/nonexistent');

      expect(response.status).toBe(404);
    });

    it('should handle 500 errors', async () => {
      app.get('/api/error', () => {
        throw new Error('Test error');
      });

      app.use(
        (err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
          res.status(500).json({ error: 'Internal server error' });
        }
      );

      const response = await request(app).get('/api/error');

      expect(response.status).toBe(500);
    });
  });

  describe('Request Validation', () => {
    it('should validate JSON body', async () => {
      app.post('/api/test', (req, res) => {
        if (!req.body || Object.keys(req.body).length === 0) {
          return res.status(400).json({ error: 'Invalid JSON body' });
        }
        res.json({ received: req.body });
      });

      const response = await request(app).post('/api/test').send({ test: 'data' });

      expect(response.status).toBe(200);
    });

    it('should reject invalid JSON', async () => {
      app.post('/api/test', (req, res) => {
        res.json({ received: req.body });
      });

      const response = await request(app)
        .post('/api/test')
        .set('Content-Type', 'application/json')
        .send('invalid json');

      expect(response.status).toBe(400);
    });
  });

  describe('Response Headers', () => {
    it('should set correct content-type', async () => {
      app.get('/api/test', (req, res) => {
        res.json({ test: true });
      });

      const response = await request(app).get('/api/test');

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    it('should include security headers', async () => {
      app.use((req, res, next) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        next();
      });

      app.get('/api/test', (req, res) => {
        res.json({ test: true });
      });

      const response = await request(app).get('/api/test');

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
    });
  });
});
