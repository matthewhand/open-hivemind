import { BotConfigurationManager } from '../../../src/config/BotConfigurationManager';
import { MCPConfig, MCPService, MCPTool } from '../../../src/mcp/MCPService';

jest.mock(
  '@hivemind/message-slack',
  () => {
    return {
      SlackMessageProvider: jest.fn().mockImplementation(() => {
        return {
          getForumOwner: jest.fn().mockResolvedValue('slack_owner_id'),
        };
      }),
    };
  },
  { virtual: true }
);

// Mock dependencies
jest.mock(
  '@modelcontextprotocol/sdk',
  () => {
    return {
      Client: jest.fn().mockImplementation(() => {
        return {
          connect: jest.fn().mockResolvedValue(undefined),
          listTools: jest.fn().mockResolvedValue({
            tools: [
              {
                name: 'test_tool',
                description: 'A test tool',
                inputSchema: { type: 'object' },
              },
            ],
          }),
          callTool: jest.fn().mockResolvedValue({ result: 'success' }),
        };
      }),
    };
  },
  { virtual: true }
);

jest.mock('../../../src/config/BotConfigurationManager', () => {
  return {
    BotConfigurationManager: {
      getInstance: jest.fn().mockReturnValue({
        getBot: jest.fn(),
      }),
    },
  };
});

// Avoid importing DiscordMessageProvider to prevent ESM issues, but mock it
jest.mock(
  '@hivemind/message-discord',
  () => {
    return {
      DiscordMessageProvider: jest.fn().mockImplementation(() => {
        return {
          getForumOwner: jest.fn().mockResolvedValue('discord_owner_id'),
        };
      }),
    };
  },
  { virtual: true }
);

describe('MCPService Integration Tests', () => {
  let mcpService: MCPService;
  let botConfigManagerMock: any;

  beforeEach(() => {
    // Reset singleton instance for isolation
    (MCPService as any).instance = undefined;
    mcpService = MCPService.getInstance();

    botConfigManagerMock = BotConfigurationManager.getInstance();
    botConfigManagerMock.getBot.mockReset();

    jest.clearAllMocks();
  });

  afterEach(async () => {
    await mcpService.disconnectAll();
  });

  describe('Connection and Tool Discovery', () => {
    it('should test connection and discover tools without saving state', async () => {
      const config: MCPConfig = {
        name: 'test-server',
        serverUrl: 'http://localhost:3000',
        apiKey: 'test-key',
      };

      const tools = await mcpService.testConnection(config);

      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('test_tool');
      expect(tools[0].serverName).toBe('test-server');

      // State should not be saved
      expect(mcpService.getConnectedServers()).toHaveLength(0);
      expect(mcpService.getAllTools()).toHaveLength(0);
    });

    it('should connect to server, discover tools and save state', async () => {
      const config: MCPConfig = {
        name: 'test-server-2',
        serverUrl: 'http://localhost:3001',
        apiKey: 'test-key-2',
      };

      const tools = await mcpService.connectToServer(config);

      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('test_tool');
      expect(tools[0].serverName).toBe('test-server-2');

      // State should be saved
      expect(mcpService.getConnectedServers()).toContain('test-server-2');
      expect(mcpService.getAllTools()).toHaveLength(1);
      expect(mcpService.getToolsFromServer('test-server-2')).toHaveLength(1);
    });

    it('should disconnect from a specific server', async () => {
      const config: MCPConfig = {
        name: 'test-server-3',
        serverUrl: 'http://localhost:3002',
      };

      await mcpService.connectToServer(config);
      expect(mcpService.getConnectedServers()).toContain('test-server-3');

      await mcpService.disconnectFromServer('test-server-3');
      expect(mcpService.getConnectedServers()).not.toContain('test-server-3');
      expect(mcpService.getToolsFromServer('test-server-3')).toBeUndefined();
    });
  });

  describe('Tool Execution and Guard Logic', () => {
    beforeEach(async () => {
      await mcpService.connectToServer({
        name: 'exec-server',
        serverUrl: 'http://localhost:4000',
      });
    });

    it('should execute a tool successfully without guard context', async () => {
      const result = await mcpService.executeTool('exec-server', 'test_tool', { param: 'value' });
      expect(result).toEqual({ result: 'success' });
    });

    it('should throw an error if server is not connected', async () => {
      await expect(mcpService.executeTool('non-existent-server', 'test_tool', {})).rejects.toThrow(
        /Not connected to MCP server/
      );
    });

    it('should allow execution if guard is disabled', async () => {
      botConfigManagerMock.getBot.mockReturnValue({
        mcpGuard: { enabled: false },
      });

      const result = await mcpService.executeTool(
        'exec-server',
        'test_tool',
        {},
        { botName: 'test-bot' }
      );
      expect(result).toEqual({ result: 'success' });
    });

    it('should throw error if userId is missing when guard is enabled', async () => {
      botConfigManagerMock.getBot.mockReturnValue({
        mcpGuard: { enabled: true, type: 'custom', allowedUserIds: ['user123'] },
      });

      await expect(
        mcpService.executeTool(
          'exec-server',
          'test_tool',
          {},
          { botName: 'test-bot' } // No userId
        )
      ).rejects.toThrow(/requesting user ID is required/);
    });

    it('should allow execution for specific allowed users', async () => {
      botConfigManagerMock.getBot.mockReturnValue({
        mcpGuard: { enabled: true, type: 'custom', allowedUserIds: ['allowed_user'] },
      });

      const result = await mcpService.executeTool(
        'exec-server',
        'test_tool',
        {},
        { botName: 'test-bot', userId: 'allowed_user', forumOwnerId: 'does_not_matter' }
      );
      expect(result).toEqual({ result: 'success' });
    });

    it('should deny execution for non-allowed users', async () => {
      botConfigManagerMock.getBot.mockReturnValue({
        mcpGuard: { enabled: true, type: 'custom', allowedUserIds: ['allowed_user'] },
      });

      await expect(
        mcpService.executeTool(
          'exec-server',
          'test_tool',
          {},
          { botName: 'test-bot', userId: 'unauthorized_user', forumOwnerId: 'does_not_matter' }
        )
      ).rejects.toThrow(/access denied by guard configuration/);
    });

    it('should allow execution for forum owner', async () => {
      botConfigManagerMock.getBot.mockReturnValue({
        mcpGuard: { enabled: true, type: 'owner' },
      });

      const result = await mcpService.executeTool(
        'exec-server',
        'test_tool',
        {},
        { botName: 'test-bot', userId: 'owner123', forumOwnerId: 'owner123' }
      );
      expect(result).toEqual({ result: 'success' });
    });

    it('should deny execution if not forum owner', async () => {
      botConfigManagerMock.getBot.mockReturnValue({
        mcpGuard: { enabled: true, type: 'owner' },
      });

      await expect(
        mcpService.executeTool(
          'exec-server',
          'test_tool',
          {},
          { botName: 'test-bot', userId: 'not_owner', forumOwnerId: 'owner123' }
        )
      ).rejects.toThrow(/access denied by guard configuration/);
    });

    it('should resolve forum owner dynamically for Slack', async () => {
      botConfigManagerMock.getBot.mockReturnValue({
        mcpGuard: { enabled: true, type: 'owner' },
        messageProvider: 'slack',
      });

      const result = await mcpService.executeTool(
        'exec-server',
        'test_tool',
        {},
        { botName: 'test-bot', userId: 'slack_owner_id', forumId: 'slack_forum' }
      );
      expect(result).toEqual({ result: 'success' });
    });

    it('should resolve forum owner dynamically for Discord', async () => {
      botConfigManagerMock.getBot.mockReturnValue({
        mcpGuard: { enabled: true, type: 'owner' },
        messageProvider: 'discord',
      });

      const result = await mcpService.executeTool(
        'exec-server',
        'test_tool',
        {},
        { botName: 'test-bot', userId: 'discord_owner_id', forumId: 'discord_forum' }
      );
      expect(result).toEqual({ result: 'success' });
    });

    it('should throw error if owner cannot be resolved dynamically', async () => {
      botConfigManagerMock.getBot.mockReturnValue({
        mcpGuard: { enabled: true, type: 'owner' },
        messageProvider: 'unknown_provider',
      });

      await expect(
        mcpService.executeTool(
          'exec-server',
          'test_tool',
          {},
          { botName: 'test-bot', userId: 'user123', forumId: 'some_forum' }
        )
      ).rejects.toThrow(/unable to determine forum owner/);
    });
  });
});
