import request from 'supertest';
import express from 'express';
import { MCPService } from '../../src/mcp/MCPService';

// Mock dependencies BEFORE importing admin router
jest.mock('../../src/mcp/MCPService');
jest.mock('../../src/auth/middleware', () => ({
  authenticate: (req: any, res: any, next: any) => next(),
  requireAdmin: (req: any, res: any, next: any) => next(),
}));
jest.mock('../../src/database/DatabaseManager', () => ({
  DatabaseManager: {
    getInstance: jest.fn().mockReturnValue({
      isConnected: jest.fn().mockReturnValue(true),
    }),
  },
}));
jest.mock('../../src/storage/webUIStorage', () => ({
  webUIStorage: {
    saveLlmProvider: jest.fn(),
    saveMessengerProvider: jest.fn(),
  },
}));
jest.mock('../../src/utils/envUtils', () => ({
  checkBotEnvOverrides: jest.fn(),
  getRelevantEnvVars: jest.fn(),
}));

// Mock sub-routers
jest.mock('../../src/server/routes/activity', () => require('express').Router());
jest.mock('../../src/server/routes/agents', () => require('express').Router());
jest.mock('../../src/server/routes/mcp', () => require('express').Router());

// Now import the router
import adminRouter from '../../src/server/routes/admin';

describe('Admin Routes - MCP', () => {
  let app: express.Express;
  let mockTestConnection: jest.Mock;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/admin', adminRouter);

    mockTestConnection = jest.fn();
    (MCPService.getInstance as jest.Mock).mockReturnValue({
      testConnection: mockTestConnection,
      getConnectedServers: jest.fn().mockReturnValue([]),
      getToolsFromServer: jest.fn().mockReturnValue([]),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/admin/mcp-servers/test', () => {
    it('should return 200 on successful connection test', async () => {
      mockTestConnection.mockResolvedValue(true);

      const response = await request(app)
        .post('/api/admin/mcp-servers/test')
        .send({
          serverUrl: 'http://localhost:3000',
          apiKey: 'test-key',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockTestConnection).toHaveBeenCalledWith(expect.objectContaining({
        serverUrl: 'http://localhost:3000',
        apiKey: 'test-key',
      }));
    });

    it('should return 400 if serverUrl is missing', async () => {
      const response = await request(app)
        .post('/api/admin/mcp-servers/test')
        .send({
          apiKey: 'test-key',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation error');
      expect(mockTestConnection).not.toHaveBeenCalled();
    });

    it('should return 400 if serverUrl is invalid', async () => {
      const response = await request(app)
        .post('/api/admin/mcp-servers/test')
        .send({
          serverUrl: 'not-a-url',
        });

      expect(response.status).toBe(400);
      expect(mockTestConnection).not.toHaveBeenCalled();
    });

    it('should return 500 if testConnection fails', async () => {
      mockTestConnection.mockRejectedValue(new Error('Connection failed'));

      const response = await request(app)
        .post('/api/admin/mcp-servers/test')
        .send({
          serverUrl: 'http://localhost:3000',
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to connect to MCP server');
    });
  });
});
