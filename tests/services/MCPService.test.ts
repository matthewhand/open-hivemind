import { MCPService } from '../../src/mcp/MCPService';

// Mock the SDK
jest.mock('@modelcontextprotocol/sdk', () => {
  const mockConnect = jest.fn().mockResolvedValue(undefined);
  const mockListTools = jest.fn().mockResolvedValue({ tools: [] });

  return {
    Client: jest.fn().mockImplementation(() => ({
      connect: mockConnect,
      listTools: mockListTools,
    })),
  };
}, { virtual: true });

describe('MCPService', () => {
  let mcpService: MCPService;

  beforeEach(() => {
    mcpService = MCPService.getInstance();
    jest.clearAllMocks();
  });

  describe('testConnection', () => {
    it('should return true when connection and listTools succeed', async () => {
      const config = {
        name: 'test-server',
        serverUrl: 'http://localhost:3000',
        apiKey: 'test-key',
      };

      const result = await mcpService.testConnection(config);
      expect(result).toBe(true);
    });

    it('should throw error when connection fails', async () => {
      const { Client } = require('@modelcontextprotocol/sdk');
      // Override the implementation for this test
      (Client as jest.Mock).mockImplementationOnce(() => ({
        connect: jest.fn().mockRejectedValue(new Error('Connection failed')),
      }));

      const config = {
        name: 'test-server',
        serverUrl: 'http://localhost:3000',
      };

      await expect(mcpService.testConnection(config)).rejects.toThrow('Failed to connect to MCP server test-server: Connection failed');
    });
  });
});
