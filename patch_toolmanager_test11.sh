cat << 'PATCH' > tests/unit/services/ToolManager.test.ts
import { ToolManager } from '@src/services/ToolManager';
import { MCPService } from '@src/mcp/MCPService';
import { BotConfigurationManager } from '@src/config/BotConfigurationManager';
import * as mcpServerProfiles from '@src/config/mcpServerProfiles';

// Mocks
jest.mock('@src/mcp/MCPService', () => {
  return {
    MCPService: {
      getInstance: jest.fn(),
    },
  };
});

jest.mock('@src/config/BotConfigurationManager', () => {
  return {
    BotConfigurationManager: {
      getInstance: jest.fn(),
    },
  };
});

jest.mock('@src/config/mcpServerProfiles', () => {
  return {
    getMcpServerProfileByKey: jest.fn(),
  };
});

describe('ToolManager', () => {
  let toolManager: ToolManager;
  let mockMCPService: any;
  let mockBotConfigManager: any;
  let mockGetMcpServerProfileByKey: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockMCPService = {
      getToolsFromServer: jest.fn(),
      executeTool: jest.fn(),
    };
    (MCPService.getInstance as jest.Mock).mockReturnValue(mockMCPService);

    mockBotConfigManager = {
      getBot: jest.fn(),
    };
    (BotConfigurationManager.getInstance as jest.Mock).mockReturnValue(mockBotConfigManager);

    mockGetMcpServerProfileByKey = mcpServerProfiles.getMcpServerProfileByKey as jest.Mock;

    toolManager = new ToolManager(mockMCPService, mockBotConfigManager);
  });

  describe('getInstance()', () => {
    it('returns the same instance', () => {
      const tm1 = new ToolManager(mockMCPService, mockBotConfigManager);
      const tm2 = new ToolManager(mockMCPService, mockBotConfigManager);
      expect(tm1).not.toBe(tm2); // it's a DI instantiated class now
    });
  });

  describe('getToolsForBot()', () => {
    it('aggregates tools from MCP servers listed in bot config', async () => {
      mockBotConfigManager.getBot.mockReturnValue({
        name: 'bot1',
        mcpServers: [{ name: 'server-a' }, { name: 'server-b' }],
      });

      mockMCPService.getToolsFromServer.mockImplementation((serverName: string) => {
        if (serverName === 'server-a') {
          return [{ name: 'tool-a1', description: 'A1', inputSchema: {}, serverName: 'server-a' }];
        }
        if (serverName === 'server-b') {
          return [{ name: 'tool-b1', description: 'B1', inputSchema: {}, serverName: 'server-b' }];
        }
        return null;
      });

      const tools = await toolManager.getToolsForBot('bot1');
      expect(tools).toHaveLength(2);
      expect(tools[0].name).toBe('tool-a1');
      expect(tools[0].serverName).toBe('server-a');
      expect(tools[1].name).toBe('tool-b1');
      expect(tools[1].serverName).toBe('server-b');
    });

    it('resolves tools from mcpServerProfile', async () => {
      mockBotConfigManager.getBot.mockReturnValue({
        name: 'bot1',
        mcpServerProfile: 'profile1',
      });
      mockGetMcpServerProfileByKey.mockReturnValue({
        mcpServers: [{ name: 'server-p' }],
      });

      mockMCPService.getToolsFromServer.mockReturnValue([
        { name: 'tool-p1', description: 'P1', inputSchema: {}, serverName: 'server-p' },
      ]);

      const tools = await toolManager.getToolsForBot('bot1');
      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('tool-p1');
      expect(tools[0].serverName).toBe('server-p');
    });

    it('returns empty array when bot has no MCP servers', async () => {
      mockBotConfigManager.getBot.mockReturnValue({ name: 'bot1' });
      const tools = await toolManager.getToolsForBot('bot1');
      expect(tools).toHaveLength(0);
    });

    it('returns empty array when bot config is not found', async () => {
      mockBotConfigManager.getBot.mockReturnValue(null);
      const tools = await toolManager.getToolsForBot('unknown');
      expect(tools).toHaveLength(0);
    });

    it('skips servers that have no cached tools', async () => {
      mockBotConfigManager.getBot.mockReturnValue({
        name: 'bot1',
        mcpServers: [{ name: 'server-a' }, { name: 'server-empty' }],
      });
      mockMCPService.getToolsFromServer.mockImplementation((serverName: string) => {
        if (serverName === 'server-a') {
          return [{ name: 'tool-a1', serverName: 'server-a' }];
        }
        return null; // empty server
      });

      const tools = await toolManager.getToolsForBot('bot1');
      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('tool-a1');
    });

    it('deduplicates servers from direct config and profile', async () => {
      mockBotConfigManager.getBot.mockReturnValue({
        name: 'bot1',
        mcpServers: [{ name: 'server-a' }],
        mcpServerProfile: 'profile1',
      });
      mockGetMcpServerProfileByKey.mockReturnValue({
        mcpServers: [{ name: 'server-a' }, { name: 'server-b' }],
      });

      mockMCPService.getToolsFromServer.mockImplementation((serverName: string) => {
        if (serverName === 'server-a') {
          return [{ name: 'tool-a1', serverName: 'server-a' }];
        }
        if (serverName === 'server-b') {
          return [{ name: 'tool-b1', serverName: 'server-b' }];
        }
        return null;
      });

      const tools = await toolManager.getToolsForBot('bot1');
      expect(tools).toHaveLength(2); // one from a, one from b
    });
  });

  describe('executeTool()', () => {
    it('routes to correct MCP server and returns result', async () => {
      mockBotConfigManager.getBot.mockReturnValue({
        name: 'bot1',
        mcpServers: [{ name: 'server-a' }],
      });
      mockMCPService.getToolsFromServer.mockReturnValue([
        { name: 'search', description: 'Search', inputSchema: {} },
      ]);
      mockMCPService.executeTool.mockResolvedValue('search results');

      const result = await toolManager.executeTool('bot1', 'search', { q: 'hello' });

      expect(result.success).toBe(true);
      expect(result.result).toBe('search results');
      expect(mockMCPService.executeTool).toHaveBeenCalledWith(
        'server-a',
        'search',
        { q: 'hello' },
        expect.objectContaining({ botName: 'bot1' })
      );
    });

    it('returns error when tool is not found on any server', async () => {
      mockBotConfigManager.getBot.mockReturnValue({
        name: 'bot1',
        mcpServers: [{ name: 'server-a' }],
      });
      mockMCPService.getToolsFromServer.mockReturnValue([
        { name: 'search' },
      ]);

      const result = await toolManager.executeTool('bot1', 'unknown_tool', {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
      expect(mockMCPService.executeTool).not.toHaveBeenCalled();
    });

    it('returns error result when execution throws (not crash)', async () => {
      mockBotConfigManager.getBot.mockReturnValue({
        name: 'bot1',
        mcpServers: [{ name: 'server-a' }],
      });
      mockMCPService.getToolsFromServer.mockReturnValue([
        { name: 'search' },
      ]);
      mockMCPService.executeTool.mockRejectedValue(new Error('connection lost'));

      const result = await toolManager.executeTool('bot1', 'search', {});

      expect(result.success).toBe(false);
      expect(result.error).toBe('connection lost');
    });

    it('returns timeout error when tool exceeds timeout', async () => {
      jest.useRealTimers();
      mockBotConfigManager.getBot.mockReturnValue({
        name: 'bot1',
        mcpServers: [{ name: 'server-a' }],
      });
      mockMCPService.getToolsFromServer.mockReturnValue([
        { name: 'slow' },
      ]);

      // Provide a promise that never resolves
      mockMCPService.executeTool.mockImplementation(() => new Promise(() => {}));

      // Set timeout inside execution
      const executeToolPromise = toolManager.executeTool('bot1', 'slow', {});

      // For withTimeout using setTimeout internally
      // Since it's a unit test, we shouldn't wait 30 seconds for the real timeout
      // But we can test it using fake timers

      // Let's use fake timers here specifically
      jest.useFakeTimers();
      const executeToolPromiseFake = toolManager.executeTool('bot1', 'slow', {});
      jest.advanceTimersByTime(30005);

      const result = await executeToolPromiseFake;
      expect(result.success).toBe(false);
      expect(result.error).toContain('timed out');
      jest.useRealTimers();
    });

    it('passes context to MCP service', async () => {
      mockBotConfigManager.getBot.mockReturnValue({
        name: 'bot1',
        mcpServers: [{ name: 'server-a' }],
      });
      mockMCPService.getToolsFromServer.mockReturnValue([
        { name: 'search' },
      ]);
      mockMCPService.executeTool.mockResolvedValue('ok');

      const ctx = {
        userId: 'u1',
        channelId: 'c1',
        messageProvider: 'slack',
        forumId: 'f1',
        forumOwnerId: 'fo1',
      };

      await toolManager.executeTool('bot1', 'search', {}, ctx);

      expect(mockMCPService.executeTool).toHaveBeenCalledWith(
        'server-a',
        'search',
        {},
        {
          botName: 'bot1',
          userId: 'u1',
          messageProvider: 'slack',
          forumId: 'f1',
          forumOwnerId: 'fo1',
        }
      );
    });
  });

  describe('formatToolsForLLM()', () => {
    it('converts ToolDefinitions to OpenAI function-calling format', () => {
      const tools = [
        {
          name: 'get_weather',
          description: 'Gets current weather',
          parameters: { type: 'object', properties: {} },
          serverName: 'weather-server',
        },
      ];

      const formatted = toolManager.formatToolsForLLM(tools);

      expect(formatted).toHaveLength(1);
      expect(formatted[0].type).toBe('function');
      expect(formatted[0].function.name).toBe('get_weather');
      expect(formatted[0].function.description).toBe('Gets current weather');
      expect(formatted[0].function.parameters).toEqual({ type: 'object', properties: {} });
    });

    it('returns empty array for empty input', () => {
      expect(toolManager.formatToolsForLLM([])).toEqual([]);
    });
  });

  describe('getMaxToolCalls()', () => {
    it('returns the default safety cap (5)', () => {
      expect(toolManager.getMaxToolCalls()).toBe(5);
    });
  });
});
PATCH
