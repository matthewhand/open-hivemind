/**
 * Contract tests for IToolProvider implementations.
 *
 * These tests verify that every tool provider conforms to the IToolProvider
 * interface defined in packages/shared-types/src/IToolProvider.ts. The MCP SDK
 * is mocked globally via jest.config.js moduleNameMapper.
 */

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('debug', () => {
  const noop: any = () => {};
  noop.extend = () => noop;
  return () => noop;
});

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import type {
  IToolProvider,
  ToolDefinition,
  ToolResult,
} from '@hivemind/shared-types';
import { McpToolProvider } from '../../packages/tool-mcp/src/McpToolProvider';

// Access the shared mock functions from the global MCP SDK mock
import { mockListTools, mockCallTool, mockConnect } from '../../tests/mocks/modelcontextprotocol-sdk';

// ---------------------------------------------------------------------------
// Contract test factory
// ---------------------------------------------------------------------------

function runToolProviderContractTests(
  providerName: string,
  getProvider: () => IToolProvider,
) {
  describe(`IToolProvider contract: ${providerName}`, () => {
    let provider: IToolProvider;

    beforeEach(() => {
      jest.clearAllMocks();
      // Reset mock implementations to defaults
      mockConnect.mockResolvedValue(undefined);
      mockListTools.mockResolvedValue({
        tools: [
          { name: 'echo', description: 'Echoes input', inputSchema: { type: 'object' } },
          { name: 'calculate', description: 'Performs math' },
        ],
      });
      mockCallTool.mockResolvedValue({
        content: 'tool result',
        isError: false,
      });
      provider = getProvider();
    });

    // ----- Required properties -------------------------------------------

    it('has a string "name" property', () => {
      expect(typeof provider.name).toBe('string');
      expect(provider.name.length).toBeGreaterThan(0);
    });

    // ----- listTools() ---------------------------------------------------

    it('listTools() returns a Promise resolving to an array', async () => {
      const tools = await provider.listTools();
      expect(Array.isArray(tools)).toBe(true);
    });

    it('each tool from listTools() has a name string', async () => {
      const tools = await provider.listTools();
      for (const tool of tools) {
        expect(typeof tool.name).toBe('string');
        expect(tool.name.length).toBeGreaterThan(0);
      }
    });

    it('each tool from listTools() has optional description as string or undefined', async () => {
      const tools = await provider.listTools();
      for (const tool of tools) {
        if (tool.description !== undefined) {
          expect(typeof tool.description).toBe('string');
        }
      }
    });

    it('each tool from listTools() conforms to ToolDefinition shape', async () => {
      const tools = await provider.listTools();
      for (const tool of tools) {
        // Required
        expect(tool).toHaveProperty('name');
        // Optional fields should be correct types if present
        if (tool.inputSchema !== undefined) {
          expect(typeof tool.inputSchema).toBe('object');
        }
        if (tool.serverName !== undefined) {
          expect(typeof tool.serverName).toBe('string');
        }
      }
    });

    // ----- executeTool() -------------------------------------------------

    it('executeTool() returns a Promise resolving to a ToolResult', async () => {
      // Ensure connected first
      await provider.listTools();

      const result = await provider.executeTool('echo', { text: 'hello' });
      expect(result).toBeDefined();
      expect(result).toHaveProperty('content');
    });

    it('executeTool() result has optional isError boolean', async () => {
      await provider.listTools();
      const result = await provider.executeTool('echo', { text: 'hello' });
      if (result.isError !== undefined) {
        expect(typeof result.isError).toBe('boolean');
      }
    });

    it('executeTool() result has optional metadata object', async () => {
      await provider.listTools();
      const result = await provider.executeTool('echo', {});
      if (result.metadata !== undefined) {
        expect(typeof result.metadata).toBe('object');
      }
    });

    // ----- healthCheck() -------------------------------------------------

    it('healthCheck() returns a Promise resolving to a boolean', async () => {
      const healthy = await provider.healthCheck();
      expect(typeof healthy).toBe('boolean');
    });

    it('healthCheck() returns true when backend is reachable', async () => {
      const healthy = await provider.healthCheck();
      expect(healthy).toBe(true);
    });

    it('healthCheck() returns false when backend is unreachable', async () => {
      // Need a fresh provider so ensureConnected runs again
      mockConnect.mockRejectedValue(new Error('connection refused'));
      const freshProvider = getProvider();
      const healthy = await freshProvider.healthCheck();
      expect(healthy).toBe(false);
    });

    // ----- Error handling ------------------------------------------------

    it('executeTool() propagates errors for unknown tools', async () => {
      // First connect successfully
      await provider.listTools();
      // Then make callTool fail
      mockCallTool.mockRejectedValueOnce(new Error('Tool not found'));
      await expect(
        provider.executeTool('nonexistent-tool', {}),
      ).rejects.toThrow();
    });

    it('listTools() propagates connection errors', async () => {
      mockConnect.mockRejectedValue(new Error('ECONNREFUSED'));
      const brokenProvider = getProvider();
      await expect(brokenProvider.listTools()).rejects.toThrow();
    });
  });
}

// ---------------------------------------------------------------------------
// Run contract tests
// ---------------------------------------------------------------------------

runToolProviderContractTests('McpToolProvider', () => {
  return new McpToolProvider({
    name: 'test-mcp',
    serverUrl: 'http://localhost:3001/mcp',
    transport: 'sse',
  });
});
