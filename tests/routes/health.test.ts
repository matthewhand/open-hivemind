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

describe('Health Routes', () => {
  let app: express.Express;

  beforeEach(() => {
    app = express();
    app.use('/health', healthRouter);
    jest.clearAllMocks();
  });

  describe('GET /health/ready', () => {
    it('should return 200 and status: healthy when all services are healthy', async () => {
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
      expect(response.body.status).toBe('healthy');
      expect(response.body.checks.database.status).toBe('healthy');
      expect(response.body.checks.botAdapters.status).toBe('healthy');
      expect(response.body.checks.externalApis.status).toBe('healthy');
      expect(typeof response.body.uptime).toBe('number');
      expect(typeof response.body.version).toBe('string');
    });

    it('should return 503 and status: unhealthy when database is disconnected', async () => {
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
      expect(response.body.status).toBe('unhealthy');
      expect(response.body.checks.database.status).toBe('unhealthy');
    });
  });
});
