import express from 'express';
import request from 'supertest';
import { DatabaseManager } from '../../src/database/DatabaseManager';
import { BotManager } from '../../src/managers/BotManager';
import healthRouter from '../../src/server/routes/health';
import ApiMonitorService from '../../src/services/ApiMonitorService';

// Mock dependencies
jest.mock('../../src/database/DatabaseManager');
jest.mock('../../src/managers/BotManager');
jest.mock('../../src/monitoring/MetricsCollector');
jest.mock('../../src/services/ApiMonitorService');

const mockGetMemoryProviders = jest.fn();
jest.mock('../../src/registries/ProviderRegistry', () => ({
  ProviderRegistry: {
    getInstance: () => ({
      getMemoryProviders: mockGetMemoryProviders,
    }),
  },
}));

describe('Health Routes', () => {
  let app: express.Express;

  beforeEach(() => {
    app = express();
    app.use('/health', healthRouter);
    jest.clearAllMocks();
    // Default: no memory providers registered
    mockGetMemoryProviders.mockReturnValue(new Map());
  });

  describe('GET /health/ready', () => {
    it('should return 200 and ready: true when database is connected', async () => {
      // Setup mock returns
      (DatabaseManager.getInstance as jest.Mock).mockReturnValue({
        isConnected: jest.fn().mockReturnValue(true),
      });
      (BotManager.getInstance as jest.Mock).mockReturnValue({
        getAllBots: jest.fn().mockReturnValue(new Map()),
      });
      (ApiMonitorService.getInstance as jest.Mock).mockReturnValue({
        getAllStatuses: jest.fn().mockReturnValue({}),
      });

      const response = await request(app).get('/health/ready');

      expect(response.status).toBe(200);
      expect(response.body.ready).toBe(true);
      expect(response.body.checks.database).toBe(true);
      expect(response.body.checks.external_apis).toBe(true);
      expect(response.body.checks.configuration).toBe(true);
      expect(typeof response.body.timestamp).toBe('string');
    });

    it('should return 503 and ready: false when database is disconnected', async () => {
      (DatabaseManager.getInstance as jest.Mock).mockReturnValue({
        isConnected: jest.fn().mockReturnValue(false),
      });
      (BotManager.getInstance as jest.Mock).mockReturnValue({
        getAllBots: jest.fn().mockReturnValue(new Map()),
      });
      (ApiMonitorService.getInstance as jest.Mock).mockReturnValue({
        getAllStatuses: jest.fn().mockReturnValue({}),
      });

      const response = await request(app).get('/health/ready');

      expect(response.status).toBe(503);
      expect(response.body.ready).toBe(false);
      expect(response.body.checks.database).toBe(false);
    });
  });

  describe('GET /health (memory providers)', () => {
    beforeEach(() => {
      (DatabaseManager.getInstance as jest.Mock).mockReturnValue({
        isConnected: jest.fn().mockReturnValue(true),
      });
    });

    it('should show none_configured when no memory providers are registered', async () => {
      mockGetMemoryProviders.mockReturnValue(new Map());

      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
      expect(response.body.memoryProviders).toEqual({ status: 'none_configured' });
    });

    it('should include healthy memory provider status', async () => {
      const mockProvider = {
        healthCheck: jest.fn().mockResolvedValue({ status: 'ok' }),
      };
      mockGetMemoryProviders.mockReturnValue(new Map([['mem0', mockProvider]]));

      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
      expect(response.body.memoryProviders).toEqual({
        status: 'healthy',
        providers: {
          mem0: { status: 'ok' },
        },
      });
    });

    it('should set status to degraded when a memory provider is unhealthy', async () => {
      const healthyProvider = {
        healthCheck: jest.fn().mockResolvedValue({ status: 'ok' }),
      };
      const unhealthyProvider = {
        healthCheck: jest.fn().mockResolvedValue({ status: 'error', details: { reason: 'connection refused' } }),
      };
      mockGetMemoryProviders.mockReturnValue(
        new Map([
          ['mem0', healthyProvider],
          ['zep', unhealthyProvider],
        ])
      );

      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('degraded');
      expect(response.body.memoryProviders.status).toBe('unhealthy');
      expect(response.body.memoryProviders.providers.mem0).toEqual({ status: 'ok' });
      expect(response.body.memoryProviders.providers.zep).toEqual({
        status: 'error',
        details: { reason: 'connection refused' },
      });
    });

    it('should handle memory provider healthCheck that throws', async () => {
      const throwingProvider = {
        healthCheck: jest.fn().mockRejectedValue(new Error('timeout')),
      };
      mockGetMemoryProviders.mockReturnValue(new Map([['broken', throwingProvider]]));

      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('degraded');
      expect(response.body.memoryProviders.status).toBe('unhealthy');
      expect(response.body.memoryProviders.providers.broken).toEqual({
        status: 'error',
        details: { error: 'timeout' },
      });
    });
  });
});
