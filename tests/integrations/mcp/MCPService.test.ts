import { MCPService, MCPConfig, MCPTool } from '../../../src/mcp/MCPService';
import { BotConfigurationManager } from '../../../src/config/BotConfigurationManager';
import { MCPGuard } from '../../../src/mcp/MCPGuard';

jest.mock('@modelcontextprotocol/sdk/client/index.js', () => {
  return {
    Client: jest.fn().mockImplementation(() => {
      return {
        connect: jest.fn().mockResolvedValue(undefined),
        listTools: jest.fn().mockResolvedValue({
          tools: [
            {
              name: 'test-tool-1',
              description: 'A test tool',
              inputSchema: { type: 'object', properties: {} },
            },
            {
              name: 'test-tool-2',
              description: 'Another test tool',
              inputSchema: { type: 'object', properties: {} },
            },
          ],
        }),
        callTool: jest.fn().mockResolvedValue({ result: 'tool execution result' }),
      };
    }),
  };
});

jest.mock('../../../src/config/BotConfigurationManager', () => {
  return {
    BotConfigurationManager: {
      getInstance: jest.fn().mockReturnValue({
        getBot: jest.fn(),
      }),
    },
  };
});

jest.mock('../../../src/mcp/MCPGuard', () => {
  return {
    MCPGuard: {
      isUserAllowed: jest.fn(),
    },
  };
});

jest.mock('@hivemind/adapter-slack', () => {
  return {
    SlackMessageProvider: jest.fn().mockImplementation(() => ({
      getForumOwner: jest.fn().mockResolvedValue('slack-owner-id'),
    })),
  };
});

jest.mock('@hivemind/adapter-discord', () => {
  return {
    DiscordMessageProvider: jest.fn().mockImplementation(() => ({
      getForumOwner: jest.fn().mockResolvedValue('discord-owner-id'),
    })),
  };
});

describe('MCPService Integration', () => {
  let mcpService: MCPService;
  let mockBotConfigManager: any;

  beforeEach(() => {
    // Reset singleton for clean state in tests if possible, but MCPService uses a static instance.
    // We'll access it via getInstance.
    mcpService = MCPService.getInstance();

    // Clear any connected servers from previous tests
    (mcpService as any).clients.clear();
    (mcpService as any).tools.clear();

    mockBotConfigManager = BotConfigurationManager.getInstance();
    (mockBotConfigManager.getBot as jest.Mock).mockClear();
    (MCPGuard.isUserAllowed as jest.Mock).mockClear();
  });

  afterEach(async () => {
    await mcpService.disconnectAll();
  });

  describe('Tool Discovery', () => {
    it('should test connection and discover tools without storing client', async () => {
      const config: MCPConfig = {
        name: 'test-server-test-conn',
        serverUrl: 'http://localhost:8080',
        apiKey: 'test-api-key',
      };

      const tools = await mcpService.testConnection(config);

      expect(tools.length).toBe(2);
      expect(tools[0].name).toBe('test-tool-1');
      expect(tools[0].serverName).toBe('test-server-test-conn');

      // Client should not be stored
      expect(mcpService.getConnectedServers()).not.toContain('test-server-test-conn');
    });

    it('should connect to server and discover tools', async () => {
      const config: MCPConfig = {
        name: 'test-server',
        serverUrl: 'http://localhost:8080',
        apiKey: 'test-api-key',
      };

      const tools = await mcpService.connectToServer(config);

      expect(tools.length).toBe(2);
      expect(tools[0].name).toBe('test-tool-1');
      expect(tools[0].serverName).toBe('test-server');

      // Client should be stored
      expect(mcpService.getConnectedServers()).toContain('test-server');

      // Tools should be accessible
      const storedTools = mcpService.getToolsFromServer('test-server');
      expect(storedTools).toBeDefined();
      expect(storedTools?.length).toBe(2);

      const allTools = mcpService.getAllTools();
      expect(allTools.length).toBe(2);
    });

    it('should disconnect from server', async () => {
      const config: MCPConfig = {
        name: 'test-server-disconnect',
        serverUrl: 'http://localhost:8080',
      };

      await mcpService.connectToServer(config);
      expect(mcpService.getConnectedServers()).toContain('test-server-disconnect');

      await mcpService.disconnectFromServer('test-server-disconnect');
      expect(mcpService.getConnectedServers()).not.toContain('test-server-disconnect');
      expect(mcpService.getToolsFromServer('test-server-disconnect')).toBeUndefined();
    });
  });

  describe('Tool Execution', () => {
    beforeEach(async () => {
      const config: MCPConfig = {
        name: 'exec-server',
        serverUrl: 'http://localhost:8080',
      };
      await mcpService.connectToServer(config);
    });

    it('should execute tool successfully', async () => {
      const result = await mcpService.executeTool('exec-server', 'test-tool-1', { param: 'value' });
      expect(result).toEqual({ result: 'tool execution result' });
    });

    it('should throw error if server is not connected', async () => {
      await expect(
        mcpService.executeTool('non-existent-server', 'test-tool', {})
      ).rejects.toThrow('Not connected to MCP server: non-existent-server');
    });
  });

  describe('Guard Logic', () => {
    beforeEach(async () => {
      const config: MCPConfig = {
        name: 'guard-server',
        serverUrl: 'http://localhost:8080',
      };
      await mcpService.connectToServer(config);
    });

    it('should allow execution if guard is disabled', async () => {
      (mockBotConfigManager.getBot as jest.Mock).mockReturnValue({
        mcpGuard: { enabled: false },
      });

      const result = await mcpService.executeTool(
        'guard-server',
        'test-tool',
        {},
        { botName: 'test-bot', userId: 'user-123' }
      );

      expect(result).toEqual({ result: 'tool execution result' });
      expect(MCPGuard.isUserAllowed).not.toHaveBeenCalled();
    });

    it('should allow execution if guard allows user', async () => {
      (mockBotConfigManager.getBot as jest.Mock).mockReturnValue({
        mcpGuard: { enabled: true, type: 'owner' },
      });
      (MCPGuard.isUserAllowed as jest.Mock).mockReturnValue(true);

      const result = await mcpService.executeTool(
        'guard-server',
        'test-tool',
        {},
        { botName: 'test-bot', userId: 'user-123', forumOwnerId: 'owner-123' }
      );

      expect(result).toEqual({ result: 'tool execution result' });
      expect(MCPGuard.isUserAllowed).toHaveBeenCalledWith('user-123', 'owner-123', { enabled: true, type: 'owner' });
    });

    it('should deny execution if guard denies user', async () => {
      (mockBotConfigManager.getBot as jest.Mock).mockReturnValue({
        mcpGuard: { enabled: true, type: 'owner' },
      });
      (MCPGuard.isUserAllowed as jest.Mock).mockReturnValue(false);

      await expect(
        mcpService.executeTool(
          'guard-server',
          'test-tool',
          {},
          { botName: 'test-bot', userId: 'user-123', forumOwnerId: 'owner-123' }
        )
      ).rejects.toThrow('MCP tool access denied by guard configuration');
    });

    it('should deny execution if userId is missing', async () => {
      (mockBotConfigManager.getBot as jest.Mock).mockReturnValue({
        mcpGuard: { enabled: true, type: 'owner' },
      });

      await expect(
        mcpService.executeTool(
          'guard-server',
          'test-tool',
          {},
          { botName: 'test-bot', forumOwnerId: 'owner-123' } // Missing userId
        )
      ).rejects.toThrow('MCP tool access denied: requesting user ID is required');
    });

    it('should resolve Slack forum owner dynamically', async () => {
      (mockBotConfigManager.getBot as jest.Mock).mockReturnValue({
        messageProvider: 'slack',
        mcpGuard: { enabled: true, type: 'owner' },
      });
      (MCPGuard.isUserAllowed as jest.Mock).mockReturnValue(true);

      const result = await mcpService.executeTool(
        'guard-server',
        'test-tool',
        {},
        { botName: 'test-bot', userId: 'user-123', forumId: 'channel-123' }
      );

      expect(result).toEqual({ result: 'tool execution result' });
      expect(MCPGuard.isUserAllowed).toHaveBeenCalledWith('user-123', 'slack-owner-id', expect.anything());
    });

    it('should resolve Discord forum owner dynamically', async () => {
      (mockBotConfigManager.getBot as jest.Mock).mockReturnValue({
        messageProvider: 'discord',
        mcpGuard: { enabled: true, type: 'owner' },
      });
      (MCPGuard.isUserAllowed as jest.Mock).mockReturnValue(true);

      const result = await mcpService.executeTool(
        'guard-server',
        'test-tool',
        {},
        { botName: 'test-bot', userId: 'user-123', forumId: 'channel-123' }
      );

      expect(result).toEqual({ result: 'tool execution result' });
      expect(MCPGuard.isUserAllowed).toHaveBeenCalledWith('user-123', 'discord-owner-id', expect.anything());
    });

    it('should deny execution if owner cannot be resolved and type is owner', async () => {
      (mockBotConfigManager.getBot as jest.Mock).mockReturnValue({
        messageProvider: 'unknown-provider',
        mcpGuard: { enabled: true, type: 'owner' },
      });

      await expect(
        mcpService.executeTool(
          'guard-server',
          'test-tool',
          {},
          { botName: 'test-bot', userId: 'user-123', forumId: 'channel-123' }
        )
      ).rejects.toThrow('MCP tool access denied: unable to determine forum owner');
    });
  });
});
