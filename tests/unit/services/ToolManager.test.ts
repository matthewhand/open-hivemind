import { ToolDefinition, ToolManager } from '@src/services/ToolManager';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGetBot = jest.fn();
jest.mock('@config/BotConfigurationManager', () => ({
  BotConfigurationManager: {
    getInstance: () => ({ getBot: mockGetBot }),
  },
}));

const mockGetMcpServerProfileByKey = jest.fn();
jest.mock('@config/mcpServerProfiles', () => ({
  getMcpServerProfileByKey: (...args: any[]) => mockGetMcpServerProfileByKey(...args),
}));

const mockGetToolsFromServer = jest.fn();
const mockExecuteTool = jest.fn();
jest.mock('@src/mcp/MCPService', () => ({
  MCPService: {
    getInstance: () => ({
      getToolsFromServer: mockGetToolsFromServer,
      executeTool: mockExecuteTool,
    }),
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function freshManager(): ToolManager {
  (ToolManager as any).instance = undefined;
  return ToolManager.getInstance();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ToolManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // === Singleton ===

  describe('getInstance()', () => {
    it('returns the same instance', () => {
      (ToolManager as any).instance = undefined;
      expect(ToolManager.getInstance()).toBe(ToolManager.getInstance());
    });
  });

  // === getToolsForBot ===

  describe('getToolsForBot()', () => {
    it('aggregates tools from MCP servers listed in bot config', async () => {
      const mgr = freshManager();
      mockGetBot.mockReturnValue({
        name: 'bot1',
        mcpServers: [{ name: 'server-a' }, { name: 'server-b' }],
      });

      mockGetToolsFromServer
        .mockReturnValueOnce([
          {
            name: 'search',
            description: 'Search',
            inputSchema: { type: 'object' },
            serverName: 'server-a',
          },
        ])
        .mockReturnValueOnce([
          {
            name: 'fetch',
            description: 'Fetch URL',
            inputSchema: { type: 'object' },
            serverName: 'server-b',
          },
        ]);

      const tools = await mgr.getToolsForBot('bot1');

      expect(tools).toHaveLength(2);
      expect(tools[0]).toMatchObject({ name: 'search', serverName: 'server-a' });
      expect(tools[1]).toMatchObject({ name: 'fetch', serverName: 'server-b' });
    });

    it('resolves tools from mcpServerProfile', async () => {
      const mgr = freshManager();
      mockGetBot.mockReturnValue({
        name: 'bot1',
        mcpServerProfile: 'web-tools',
      });
      mockGetMcpServerProfileByKey.mockReturnValue({
        mcpServers: [{ name: 'web-server' }],
      });
      mockGetToolsFromServer.mockReturnValue([
        { name: 'browse', description: 'Browse', inputSchema: {}, serverName: 'web-server' },
      ]);

      const tools = await mgr.getToolsForBot('bot1');
      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('browse');
    });

    it('returns empty array when bot has no MCP servers', async () => {
      const mgr = freshManager();
      mockGetBot.mockReturnValue({ name: 'bot1' });

      const tools = await mgr.getToolsForBot('bot1');
      expect(tools).toEqual([]);
    });

    it('returns empty array when bot config is not found', async () => {
      const mgr = freshManager();
      mockGetBot.mockReturnValue(undefined);

      const tools = await mgr.getToolsForBot('unknown');
      expect(tools).toEqual([]);
    });

    it('skips servers that have no cached tools', async () => {
      const mgr = freshManager();
      mockGetBot.mockReturnValue({
        name: 'bot1',
        mcpServers: [{ name: 'server-a' }, { name: 'server-b' }],
      });
      mockGetToolsFromServer
        .mockReturnValueOnce(undefined) // server-a not connected
        .mockReturnValueOnce([
          { name: 'tool1', description: 'T', inputSchema: {}, serverName: 'server-b' },
        ]);

      const tools = await mgr.getToolsForBot('bot1');
      expect(tools).toHaveLength(1);
    });

    it('deduplicates servers from direct config and profile', async () => {
      const mgr = freshManager();
      mockGetBot.mockReturnValue({
        name: 'bot1',
        mcpServers: [{ name: 'shared-server' }],
        mcpServerProfile: 'profile1',
      });
      mockGetMcpServerProfileByKey.mockReturnValue({
        mcpServers: [{ name: 'shared-server' }],
      });
      mockGetToolsFromServer.mockReturnValue([
        { name: 'tool1', description: 'T', inputSchema: {}, serverName: 'shared-server' },
      ]);

      const tools = await mgr.getToolsForBot('bot1');
      // Should only query the server once (deduplication via Set).
      expect(mockGetToolsFromServer).toHaveBeenCalledTimes(1);
      expect(tools).toHaveLength(1);
    });
  });

  // === executeTool ===

  describe('executeTool()', () => {
    it('routes to correct MCP server and returns result', async () => {
      jest.useRealTimers();
      const mgr = freshManager();
      mockGetBot.mockReturnValue({
        name: 'bot1',
        mcpServers: [{ name: 'server-a' }],
      });
      mockGetToolsFromServer.mockReturnValue([
        { name: 'search', description: 'S', inputSchema: {}, serverName: 'server-a' },
      ]);
      mockExecuteTool.mockResolvedValue({ content: [{ type: 'text', text: 'result' }] });

      const result = await mgr.executeTool('bot1', 'search', { query: 'hello' });

      expect(result).toMatchObject({ toolName: 'search', success: true });
      expect(mockExecuteTool).toHaveBeenCalledWith(
        'server-a',
        'search',
        { query: 'hello' },
        expect.objectContaining({ botName: 'bot1' })
      );
    });

    it('returns error when tool is not found on any server', async () => {
      jest.useRealTimers();
      const mgr = freshManager();
      mockGetBot.mockReturnValue({
        name: 'bot1',
        mcpServers: [{ name: 'server-a' }],
      });
      mockGetToolsFromServer.mockReturnValue([]);

      const result = await mgr.executeTool('bot1', 'nonexistent', {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('returns error result when execution throws (not crash)', async () => {
      jest.useRealTimers();
      const mgr = freshManager();
      mockGetBot.mockReturnValue({
        name: 'bot1',
        mcpServers: [{ name: 'server-a' }],
      });
      mockGetToolsFromServer.mockReturnValue([
        { name: 'search', description: 'S', inputSchema: {}, serverName: 'server-a' },
      ]);
      mockExecuteTool.mockRejectedValue(new Error('connection lost'));

      const result = await mgr.executeTool('bot1', 'search', {});

      expect(result.success).toBe(false);
      expect(result.error).toBe('connection lost');
    });

    it('returns timeout error when tool exceeds timeout', async () => {
      const mgr = freshManager();
      mockGetBot.mockReturnValue({
        name: 'bot1',
        mcpServers: [{ name: 'server-a' }],
      });
      mockGetToolsFromServer.mockReturnValue([
        { name: 'slow', description: 'S', inputSchema: {}, serverName: 'server-a' },
      ]);
      // Never resolves.
      mockExecuteTool.mockReturnValue(new Promise(() => {}));

      const resultPromise = mgr.executeTool('bot1', 'slow', {});
      jest.advanceTimersByTime(30_001);

      const result = await resultPromise;
      expect(result.success).toBe(false);
      expect(result.error).toContain('timed out');
    });

    it('passes context to MCP service', async () => {
      jest.useRealTimers();
      const mgr = freshManager();
      mockGetBot.mockReturnValue({
        name: 'bot1',
        mcpServers: [{ name: 'server-a' }],
      });
      mockGetToolsFromServer.mockReturnValue([
        { name: 'tool1', description: 'T', inputSchema: {}, serverName: 'server-a' },
      ]);
      mockExecuteTool.mockResolvedValue({});

      await mgr.executeTool(
        'bot1',
        'tool1',
        {},
        {
          userId: 'u1',
          channelId: 'ch1',
          messageProvider: 'discord',
        }
      );

      expect(mockExecuteTool).toHaveBeenCalledWith(
        'server-a',
        'tool1',
        {},
        expect.objectContaining({ userId: 'u1', messageProvider: 'discord' })
      );
    });
  });

  // === formatToolsForLLM ===

  describe('formatToolsForLLM()', () => {
    it('converts ToolDefinitions to OpenAI function-calling format', () => {
      const mgr = freshManager();
      const tools: ToolDefinition[] = [
        {
          name: 'search',
          description: 'Search the web',
          parameters: { type: 'object', properties: { query: { type: 'string' } } },
          serverName: 'server-a',
        },
      ];

      const formatted = mgr.formatToolsForLLM(tools);

      expect(formatted).toHaveLength(1);
      expect(formatted[0]).toEqual({
        type: 'function',
        function: {
          name: 'search',
          description: 'Search the web',
          parameters: { type: 'object', properties: { query: { type: 'string' } } },
        },
      });
    });

    it('returns empty array for empty input', () => {
      const mgr = freshManager();
      expect(mgr.formatToolsForLLM([])).toEqual([]);
    });
  });

  // === getMaxToolCalls ===

  describe('getMaxToolCalls()', () => {
    it('returns the default safety cap (5)', () => {
      const mgr = freshManager();
      expect(mgr.getMaxToolCalls()).toBe(5);
    });
  });
});
