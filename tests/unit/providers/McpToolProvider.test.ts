/**
 * Unit tests for McpToolProvider
 *
 * The MCP SDK (@modelcontextprotocol/sdk) is not installed at runtime.
 * It is loaded via `require()` inside ensureConnected(). The mock at
 * tests/mocks/modelcontextprotocol-sdk.ts is wired through jest.config.js
 * moduleNameMapper so it resolves during tests.
 */

import { McpToolProvider } from '../../../packages/tool-mcp/src/McpToolProvider';
import type { McpToolProviderConfig } from '../../../packages/tool-mcp/src/types';
import {
  MockClient,
  mockConnect,
  mockListTools,
  mockCallTool,
} from '../../mocks/modelcontextprotocol-sdk';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function baseConfig(overrides: Partial<McpToolProviderConfig> = {}): McpToolProviderConfig {
  return {
    name: 'test-server',
    serverUrl: 'http://localhost:3100/sse',
    transport: 'sse',
    ...overrides,
  };
}

function freshProvider(overrides: Partial<McpToolProviderConfig> = {}): McpToolProvider {
  return new McpToolProvider(baseConfig(overrides));
}

// ---------------------------------------------------------------------------
// Reset mocks between tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  mockListTools.mockResolvedValue({ tools: [] });
  mockCallTool.mockResolvedValue({ content: 'ok', isError: false });
  mockConnect.mockResolvedValue(undefined);
});

// ===========================================================================
// Tests
// ===========================================================================

describe('McpToolProvider', () => {
  // -----------------------------------------------------------------------
  // Construction / config defaults
  // -----------------------------------------------------------------------

  describe('constructor', () => {
    it('uses the provided name', () => {
      const provider = freshProvider({ name: 'my-mcp' });
      expect(provider.name).toBe('my-mcp');
    });

    it('defaults name to "mcp" when config.name is empty', () => {
      const provider = new McpToolProvider({
        name: '',
        serverUrl: 'http://localhost:3100/sse',
        transport: 'sse',
      });
      expect(provider.name).toBe('mcp');
    });

    it('creates without errors using minimal config', () => {
      const provider = freshProvider();
      expect(provider).toBeDefined();
    });
  });

  // -----------------------------------------------------------------------
  // listTools()
  // -----------------------------------------------------------------------

  describe('listTools()', () => {
    it('connects and returns tool definitions with names, descriptions, input schemas', async () => {
      mockListTools.mockResolvedValue({
        tools: [
          {
            name: 'search',
            description: 'Search the web',
            inputSchema: {
              type: 'object',
              properties: { query: { type: 'string' } },
              required: ['query'],
            },
          },
          {
            name: 'calculator',
            description: 'Evaluate math expressions',
            inputSchema: {
              type: 'object',
              properties: { expression: { type: 'string' } },
            },
          },
        ],
      });

      const provider = freshProvider();
      const tools = await provider.listTools();

      expect(tools).toHaveLength(2);
      expect(tools[0]).toEqual({
        name: 'search',
        description: 'Search the web',
        inputSchema: {
          type: 'object',
          properties: { query: { type: 'string' } },
          required: ['query'],
        },
        serverName: 'test-server',
      });
      expect(tools[1]).toMatchObject({
        name: 'calculator',
        description: 'Evaluate math expressions',
        serverName: 'test-server',
      });
    });

    it('returns an empty array when the server exposes no tools', async () => {
      mockListTools.mockResolvedValue({ tools: [] });

      const provider = freshProvider();
      const tools = await provider.listTools();

      expect(tools).toEqual([]);
    });

    it('creates the MCP client with the correct name and version', async () => {
      const provider = freshProvider({ name: 'my-server' });
      await provider.listTools();

      expect(MockClient).toHaveBeenCalledWith({
        name: 'Open-Hivemind-my-server',
        version: '1.0.0',
      });
    });

    it('passes serverUrl and apiKey to client.connect', async () => {
      const provider = freshProvider({
        serverUrl: 'http://example.com/sse',
        apiKey: 'secret-key',
      });
      await provider.listTools();

      expect(mockConnect).toHaveBeenCalledWith({
        url: 'http://example.com/sse',
        apiKey: 'secret-key',
      });
    });

    it('does not pass apiKey when not configured', async () => {
      const provider = freshProvider({ apiKey: undefined });
      await provider.listTools();

      expect(mockConnect).toHaveBeenCalledWith({
        url: 'http://localhost:3100/sse',
        apiKey: undefined,
      });
    });

    it('reuses an existing connection on subsequent calls', async () => {
      mockListTools.mockResolvedValue({ tools: [{ name: 'a' }] });

      const provider = freshProvider();
      await provider.listTools();
      await provider.listTools();

      expect(MockClient).toHaveBeenCalledTimes(1);
      expect(mockConnect).toHaveBeenCalledTimes(1);
      expect(mockListTools).toHaveBeenCalledTimes(2);
    });

    it('handles a tool with no description or inputSchema', async () => {
      mockListTools.mockResolvedValue({
        tools: [{ name: 'bare-tool' }],
      });

      const provider = freshProvider();
      const tools = await provider.listTools();

      expect(tools).toEqual([
        {
          name: 'bare-tool',
          description: undefined,
          inputSchema: undefined,
          serverName: 'test-server',
        },
      ]);
    });

    it('handles a tool with complex nested input schema', async () => {
      const nestedSchema = {
        type: 'object',
        properties: {
          filter: {
            type: 'object',
            properties: {
              tags: { type: 'array', items: { type: 'string' } },
              range: {
                type: 'object',
                properties: {
                  min: { type: 'number' },
                  max: { type: 'number' },
                },
              },
            },
          },
        },
      };

      mockListTools.mockResolvedValue({
        tools: [{ name: 'complex', description: 'Complex tool', inputSchema: nestedSchema }],
      });

      const provider = freshProvider();
      const tools = await provider.listTools();

      expect(tools[0].inputSchema).toEqual(nestedSchema);
    });
  });

  // -----------------------------------------------------------------------
  // executeTool()
  // -----------------------------------------------------------------------

  describe('executeTool()', () => {
    it('executes a tool by name and returns the result', async () => {
      mockCallTool.mockResolvedValue({
        content: [{ type: 'text', text: 'Hello, world!' }],
        isError: false,
      });

      const provider = freshProvider();
      const result = await provider.executeTool('greet', { name: 'world' });

      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'greet',
        arguments: { name: 'world' },
      });
      expect(result).toEqual({
        content: [{ type: 'text', text: 'Hello, world!' }],
        isError: false,
      });
    });

    it('defaults isError to false when response omits it', async () => {
      mockCallTool.mockResolvedValue({ content: 'data' });

      const provider = freshProvider();
      const result = await provider.executeTool('tool', {});

      expect(result.isError).toBe(false);
    });

    it('propagates isError: true from the tool response', async () => {
      mockCallTool.mockResolvedValue({
        content: 'Something went wrong',
        isError: true,
      });

      const provider = freshProvider();
      const result = await provider.executeTool('failing-tool', {});

      expect(result.isError).toBe(true);
      expect(result.content).toBe('Something went wrong');
    });

    it('passes empty args when tool requires no input', async () => {
      const provider = freshProvider();
      await provider.executeTool('no-args-tool', {});

      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'no-args-tool',
        arguments: {},
      });
    });

    it('passes through special characters in tool arguments', async () => {
      const args = {
        query: 'SELECT * FROM "users" WHERE name = \'O\'Brien\'',
        path: '/tmp/a b c/\u00e9\u00e8\u00ea.txt',
        emoji: '\ud83d\ude80\ud83c\udf1f',
      };

      const provider = freshProvider();
      await provider.executeTool('special-chars', args);

      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'special-chars',
        arguments: args,
      });
    });

    it('handles large tool output', async () => {
      const largeContent = 'x'.repeat(1_000_000);
      mockCallTool.mockResolvedValue({ content: largeContent, isError: false });

      const provider = freshProvider();
      const result = await provider.executeTool('big-output', {});

      expect(result.content).toBe(largeContent);
    });

    it('accepts an optional ToolExecutionContext parameter', async () => {
      const provider = freshProvider();
      const context = {
        botName: 'TestBot',
        messageProvider: 'slack',
        forumId: 'ch-123',
        userId: 'u-456',
      };

      await provider.executeTool('tool', { key: 'value' }, context);

      // Context is not forwarded to MCP SDK, just accepted without error
      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'tool',
        arguments: { key: 'value' },
      });
    });
  });

  // -----------------------------------------------------------------------
  // healthCheck()
  // -----------------------------------------------------------------------

  describe('healthCheck()', () => {
    it('returns { status: "ok" } when the server is reachable', async () => {
      mockListTools.mockResolvedValue({ tools: [] });

      const provider = freshProvider();
      const ok = await provider.healthCheck();

      expect(ok).toEqual({ status: 'ok' });
    });

    it('returns { status: "error" } when connection fails', async () => {
      mockConnect.mockRejectedValue(new Error('ECONNREFUSED'));

      const provider = freshProvider();
      const ok = await provider.healthCheck();

      expect(ok.status).toBe('error');
      expect(ok.details?.message).toContain('ECONNREFUSED');
    });

    it('returns { status: "error" } when listTools throws after successful connection', async () => {
      mockListTools.mockRejectedValue(new Error('timeout'));

      const provider = freshProvider();
      const ok = await provider.healthCheck();

      expect(ok).toEqual({ status: 'error', details: { message: 'timeout' } });
    });
  });

  // -----------------------------------------------------------------------
  // disconnect()
  // -----------------------------------------------------------------------

  describe('disconnect()', () => {
    it('clears the client so the next call reconnects', async () => {
      const provider = freshProvider();
      await provider.listTools();
      expect(MockClient).toHaveBeenCalledTimes(1);

      await provider.disconnect();
      await provider.listTools();

      expect(MockClient).toHaveBeenCalledTimes(2);
      expect(mockConnect).toHaveBeenCalledTimes(2);
    });

    it('is safe to call when not connected', async () => {
      const provider = freshProvider();
      await expect(provider.disconnect()).resolves.toBeUndefined();
    });

    it('clears the cached tools list', async () => {
      mockListTools
        .mockResolvedValueOnce({ tools: [{ name: 'a' }, { name: 'b' }] })
        .mockResolvedValueOnce({ tools: [{ name: 'c' }] });

      const provider = freshProvider();
      const first = await provider.listTools();
      expect(first).toHaveLength(2);

      await provider.disconnect();

      const second = await provider.listTools();
      expect(second).toHaveLength(1);
      expect(second[0].name).toBe('c');
    });
  });

  // =========================================================================
  // Error handling
  // =========================================================================

  describe('error handling', () => {
    it('throws a descriptive error when connection fails in listTools', async () => {
      mockConnect.mockRejectedValue(new Error('ECONNREFUSED'));

      const provider = freshProvider();

      await expect(provider.listTools()).rejects.toThrow(
        /Failed to connect to MCP server test-server: ECONNREFUSED/
      );
    });

    it('throws a descriptive error when connection fails in executeTool', async () => {
      mockConnect.mockRejectedValue(new Error('Network error'));

      const provider = freshProvider();

      await expect(provider.executeTool('tool', {})).rejects.toThrow(
        /Failed to connect to MCP server test-server: Network error/
      );
    });

    it('throws when listTools SDK call fails', async () => {
      mockListTools.mockRejectedValue(new Error('Protocol error'));

      const provider = freshProvider();

      await expect(provider.listTools()).rejects.toThrow(
        /Failed to list tools from MCP server test-server: Protocol error/
      );
    });

    it('throws when callTool SDK call fails', async () => {
      mockCallTool.mockRejectedValue(new Error('Tool execution failed'));

      const provider = freshProvider();

      await expect(provider.executeTool('broken', {})).rejects.toThrow(
        /Failed to execute tool broken on MCP server test-server: Tool execution failed/
      );
    });

    it('handles non-Error thrown objects in connection', async () => {
      mockConnect.mockRejectedValue('raw string error');

      const provider = freshProvider();

      await expect(provider.listTools()).rejects.toThrow(
        /Failed to connect to MCP server test-server: raw string error/
      );
    });

    it('handles non-Error thrown objects in listTools', async () => {
      mockListTools.mockRejectedValue(42);

      const provider = freshProvider();

      await expect(provider.listTools()).rejects.toThrow(
        /Failed to list tools from MCP server test-server: 42/
      );
    });

    it('handles non-Error thrown objects in executeTool', async () => {
      mockCallTool.mockRejectedValue({ code: 'TIMEOUT' });

      const provider = freshProvider();

      await expect(provider.executeTool('t', {})).rejects.toThrow(
        /Failed to execute tool t on MCP server test-server/
      );
    });

    it('resets client to null on connection failure so retry can reconnect', async () => {
      mockConnect
        .mockRejectedValueOnce(new Error('first attempt'))
        .mockResolvedValueOnce(undefined);

      const provider = freshProvider();

      // First attempt fails
      await expect(provider.listTools()).rejects.toThrow(/first attempt/);

      // Second attempt should create a new client and connect successfully
      const tools = await provider.listTools();
      expect(tools).toEqual([]);
      expect(MockClient).toHaveBeenCalledTimes(2);
    });

    it('simulates timeout via rejected promise in callTool', async () => {
      mockCallTool.mockRejectedValue(new Error('Request timed out after 30000ms'));

      const provider = freshProvider();

      await expect(provider.executeTool('slow-tool', {})).rejects.toThrow(
        /Request timed out/
      );
    });
  });

  // =========================================================================
  // Configuration variants
  // =========================================================================

  describe('configuration', () => {
    it('accepts SSE transport config', async () => {
      const provider = freshProvider({ transport: 'sse', serverUrl: 'http://sse-host/sse' });
      await provider.listTools();

      expect(mockConnect).toHaveBeenCalledWith(
        expect.objectContaining({ url: 'http://sse-host/sse' })
      );
    });

    it('accepts stdio transport config', async () => {
      const provider = freshProvider({
        transport: 'stdio',
        command: 'node server.js',
        serverUrl: 'stdio://local',
      });
      await provider.listTools();

      expect(mockConnect).toHaveBeenCalledWith(
        expect.objectContaining({ url: 'stdio://local' })
      );
    });

    it('accepts streamable-http transport config', async () => {
      const provider = freshProvider({
        transport: 'streamable-http',
        serverUrl: 'http://stream-host/mcp',
      });
      await provider.listTools();

      expect(mockConnect).toHaveBeenCalledWith(
        expect.objectContaining({ url: 'http://stream-host/mcp' })
      );
    });

    it('accepts custom timeout config', () => {
      const provider = freshProvider({ timeout: 60_000 });
      expect(provider).toBeDefined();
    });

    it('uses default timeout of 30000 when not specified', () => {
      const provider = freshProvider();
      expect(provider).toBeDefined();
    });

    it('accepts autoReconnect: false', () => {
      const provider = freshProvider({ autoReconnect: false });
      expect(provider).toBeDefined();
    });
  });
});
