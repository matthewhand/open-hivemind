import express from 'express';
import request from 'supertest';
import adminRoutes from '../../src/server/routes/admin';

// Mock dependencies
jest.mock('../../src/storage/webUIStorage', () => ({
  __esModule: true,
  webUIStorage: {
    getLlmProviders: jest.fn(() => []),
    getMessengerProviders: jest.fn(() => []),
    getPersonas: jest.fn(() => []),
    getMcps: jest.fn(() => []),
  },
}));

const mockTestConnection = jest.fn();

jest.mock('../../src/mcp/MCPService', () => ({
  MCPService: {
    getInstance: jest.fn(() => ({
      testConnection: mockTestConnection,
      connectToServer: jest.fn(),
      disconnectFromServer: jest.fn(),
      getConnectedServers: jest.fn(() => []),
      getToolsFromServer: jest.fn(() => []),
    })),
  },
}));

jest.mock('../../src/utils/envUtils', () => ({
  getRelevantEnvVars: jest.fn(() => ({})),
}));

const app = express();
app.use(express.json());
app.use('/api/admin', adminRoutes);

describe('Admin Routes - MCP Test', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('POST /api/admin/mcp-servers/test should return success message and tools', async () => {
    const mockTools = [
      { name: 'tool1', description: 'Test Tool 1', serverName: 'Test Server' },
      { name: 'tool2', description: 'Test Tool 2', serverName: 'Test Server' },
    ];
    mockTestConnection.mockResolvedValue(mockTools);

    const testData = {
      serverUrl: 'http://localhost:3000',
      apiKey: 'test-key',
      name: 'Test Server',
    };

    const response = await request(app)
      .post('/api/admin/mcp-servers/test')
      .send(testData)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toContain('Successfully tested connection');
    expect(response.body.data).toBeDefined();
    expect(response.body.data.toolCount).toBe(2);
    expect(response.body.data.tools).toHaveLength(2);
    expect(response.body.data.tools[0].name).toBe('tool1');
  });
});
