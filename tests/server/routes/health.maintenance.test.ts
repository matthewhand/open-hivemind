/**
 * Tests for maintenance mode in health check routes
 */
import 'reflect-metadata';
import express from 'express';
import request from 'supertest';
import { UserConfigStore } from '../../../src/config/UserConfigStore';

// Mock UserConfigStore
const mockUserConfigStore = {
  isMaintenanceMode: jest.fn(),
};

jest.mock('../../../src/config/UserConfigStore', () => ({
  UserConfigStore: {
    getInstance: jest.fn(() => mockUserConfigStore),
  },
}));

// Mock other dependencies used by basic router
jest.mock('../../../src/database/DatabaseManager', () => ({
  DatabaseManager: {
    getInstance: jest.fn(() => ({
      isConnected: jest.fn().mockReturnValue(true),
    })),
  },
}));

import basicRouter from '../../../src/server/routes/health/basic';

describe('Health Routes - Maintenance Mode', () => {
  let app: express.Express;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use('/api/health', basicRouter);
  });

  describe('GET /api/health/maintenance', () => {
    it('should return maintenanceMode: false when not in maintenance', async () => {
      mockUserConfigStore.isMaintenanceMode.mockReturnValue(false);

      const res = await request(app).get('/api/health/maintenance');
      
      expect(res.status).toBe(200);
      expect(res.body.maintenanceMode).toBe(false);
      expect(res.body.message).toBe('System is operating normally');
    });

    it('should return maintenanceMode: true when in maintenance', async () => {
      mockUserConfigStore.isMaintenanceMode.mockReturnValue(true);

      const res = await request(app).get('/api/health/maintenance');
      
      expect(res.status).toBe(200);
      expect(res.body.maintenanceMode).toBe(true);
      expect(res.body.message).toBe('System is currently in maintenance mode');
    });
  });

  describe('GET /api/health - basic health check includes maintenance mode', () => {
    it('should include maintenanceMode in response', async () => {
      mockUserConfigStore.isMaintenanceMode.mockReturnValue(true);

      const res = await request(app).get('/api/health');
      
      expect(res.status).toBe(200);
      expect(res.body.maintenanceMode).toBe(true);
      expect(res.body.status).toBe('degraded');
    });
  });
});
