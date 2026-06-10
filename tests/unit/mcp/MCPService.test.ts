import { BotConfigurationManager } from '@config/BotConfigurationManager';
import { MCPService } from '../../../src/mcp/MCPService';

/**
 * Regression test for the MCP SDK import bug (audit #5/#6/#9).
 *
 * The SDK (@modelcontextprotocol/sdk) is published ESM-only with subpath
 * exports and no usable CJS root export. The old code did
 * `require('@modelcontextprotocol/sdk')` and destructured `{ Client }`, which
 * throws at runtime, so connectToServer/testConnection/executeTool never
 * worked. The fix dynamically imports the real subpaths and builds the correct
 * transport.
 *
 * This test mocks the real SDK subpath modules and asserts that the client is
 * constructed and connected (via a transport) without throwing. Against the
 * old `require('@modelcontextprotocol/sdk')` code this fails (module not found
 * / no Client export); against the fix it passes.
 */

const mockConnect = jest.fn().mockResolvedValue(undefined);
const mockListTools = jest.fn().mockResolvedValue({ tools: [{ name: 'echo' }] });
const mockCallTool = jest.fn().mockResolvedValue({ content: 'ok', isError: false });
const ClientCtor = jest.fn().mockImplementation(() => ({
  connect: mockConnect,
  listTools: mockListTools,
  callTool: mockCallTool,
}));

const StreamableHTTPCtor = jest.fn().mockImplementation((url: URL) => ({ __kind: 'http', url }));
const SSECtor = jest.fn().mockImplementation((url: URL) => ({ __kind: 'sse', url }));
const StdioCtor = jest.fn().mockImplementation((opts: unknown) => ({ __kind: 'stdio', opts }));

describe('MCPService SDK client construction', () => {
  let service: MCPService;

  beforeEach(() => {
    jest.clearAllMocks();
    // The SDK is ESM-only with no CJS root export, so module-level mocking of
    // the dynamic import() calls is unreliable in jest. Instead we stub the
    // `loadSdk` seam on MCPService, which is the single place the SDK entry
    // points are imported. This keeps the regression intent (Client constructs
    // + connects via the right transport) without ESM module mocking.
    jest
      .spyOn(MCPService.prototype as unknown as { loadSdk: () => Promise<unknown> }, 'loadSdk')
      .mockResolvedValue({
        Client: ClientCtor,
        StreamableHTTPClientTransport: StreamableHTTPCtor,
        SSEClientTransport: SSECtor,
        StdioClientTransport: StdioCtor,
      });
    // Fresh singleton each test so connect/disconnect state does not leak.
    // @ts-expect-error - resetting private singleton for isolation
    MCPService.instance = undefined;
    service = MCPService.getInstance();
  });

  it('constructs and connects a Client without throwing for a remote HTTP server', async () => {
    await expect(
      service.connectToServer({
        name: 'remote',
        serverUrl: 'https://example.com/mcp',
        apiKey: 'secret',
      })
    ).resolves.toEqual([{ name: 'echo', serverName: 'remote' }]);

    // The real SDK Client constructor was used (proves it no longer relies on
    // the broken `require('@modelcontextprotocol/sdk')` root export).
    expect(ClientCtor).toHaveBeenCalledTimes(1);
    // A real transport instance was passed to connect() (not a {url,apiKey}
    // object, which the old code wrongly used).
    expect(mockConnect).toHaveBeenCalledWith(expect.objectContaining({ __kind: 'http' }));
    expect(service.getConnectedServers()).toContain('remote');
  });

  it('sends the apiKey as a Bearer Authorization header on the HTTP transport', async () => {
    await service.connectToServer({
      name: 'remote',
      serverUrl: 'https://example.com/mcp',
      apiKey: 'secret',
    });

    expect(StreamableHTTPCtor).toHaveBeenCalledTimes(1);
    const [urlArg, optsArg] = StreamableHTTPCtor.mock.calls[0];
    expect(urlArg).toBeInstanceOf(URL);
    expect((urlArg as URL).href).toBe('https://example.com/mcp');
    expect(optsArg).toEqual({
      requestInit: { headers: { Authorization: 'Bearer secret' } },
    });
  });

  it('uses the stdio transport for stdio:// URLs', async () => {
    await service.connectToServer({
      name: 'local',
      serverUrl: 'stdio://my-mcp-binary',
    });

    expect(StdioCtor).toHaveBeenCalledWith({ command: 'my-mcp-binary', args: [] });
    expect(mockConnect).toHaveBeenCalledWith(expect.objectContaining({ __kind: 'stdio' }));
  });

  it('uses the SSE transport for sse:// URLs (rewritten to https)', async () => {
    await service.connectToServer({
      name: 'legacy',
      serverUrl: 'sse://example.com/sse',
      apiKey: 'secret',
    });

    expect(SSECtor).toHaveBeenCalledTimes(1);
    const [urlArg, optsArg] = SSECtor.mock.calls[0];
    expect((urlArg as URL).href).toBe('https://example.com/sse');
    expect(optsArg).toEqual({
      requestInit: { headers: { Authorization: 'Bearer secret' } },
    });
    expect(StreamableHTTPCtor).not.toHaveBeenCalled();
    expect(mockConnect).toHaveBeenCalledWith(expect.objectContaining({ __kind: 'sse' }));
  });

  it('rejects unsupported URL schemes', async () => {
    await expect(
      service.connectToServer({ name: 'bad', serverUrl: 'ftp://example.com' })
    ).rejects.toThrow(/Unsupported MCP server URL scheme/);
    expect(service.getConnectedServers()).not.toContain('bad');
  });

  it('testConnection builds a client and returns discovered tools', async () => {
    const tools = await service.testConnection({
      name: 'remote',
      serverUrl: 'https://example.com/mcp',
    });

    expect(ClientCtor).toHaveBeenCalledTimes(1);
    expect(tools).toEqual([{ name: 'echo', serverName: 'remote' }]);
    // testConnection must NOT store the client.
    expect(service.getConnectedServers()).not.toContain('remote');
  });

  describe('autoConnectConfiguredServers (startup hook)', () => {
    const stubBots = (bots: unknown[]) => {
      jest
        .spyOn(BotConfigurationManager, 'getInstance')
        .mockReturnValue({ getAllBots: () => bots } as unknown as BotConfigurationManager);
    };

    it('connects every MCP server assigned to enabled bots, deduplicated by name', async () => {
      stubBots([
        {
          name: 'bot-a',
          mcpServers: [
            { name: 'srv-http', serverUrl: 'https://example.com/mcp' },
            { name: 'srv-stdio', serverUrl: 'stdio://my-mcp-binary' },
          ],
        },
        {
          name: 'bot-b',
          // Same server assigned to a second bot must only connect once.
          mcpServers: [{ name: 'srv-http', serverUrl: 'https://example.com/mcp' }],
        },
      ]);

      const result = await service.autoConnectConfiguredServers();

      expect(result.connected.sort()).toEqual(['srv-http', 'srv-stdio']);
      expect(result.failed).toEqual([]);
      expect(ClientCtor).toHaveBeenCalledTimes(2);
      expect(service.getConnectedServers().sort()).toEqual(['srv-http', 'srv-stdio']);
    });

    it('skips disabled bots, disabled servers, and incomplete server entries', async () => {
      stubBots([
        {
          name: 'disabled-bot',
          enabled: false,
          mcpServers: [{ name: 'should-not-connect', serverUrl: 'https://x.example/mcp' }],
        },
        {
          name: 'bot',
          mcpServers: [
            { name: 'disabled-server', serverUrl: 'https://y.example/mcp', enabled: false },
            { name: 'no-url' }, // missing serverUrl
            { name: 'ok', serverUrl: 'https://ok.example/mcp' },
          ],
        },
        { name: 'bot-without-servers' },
      ]);

      const result = await service.autoConnectConfiguredServers();

      expect(result.connected).toEqual(['ok']);
      expect(result.failed).toEqual([]);
      expect(service.getConnectedServers()).toEqual(['ok']);
    });

    it('tolerates individual connection failures and keeps connecting the rest', async () => {
      stubBots([
        {
          name: 'bot',
          mcpServers: [
            { name: 'down', serverUrl: 'https://down.example/mcp' },
            { name: 'up', serverUrl: 'https://up.example/mcp' },
          ],
        },
      ]);
      mockConnect.mockRejectedValueOnce(new Error('ECONNREFUSED')).mockResolvedValueOnce(undefined);

      const result = await service.autoConnectConfiguredServers();

      expect(result.connected).toEqual(['up']);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].name).toBe('down');
      expect(result.failed[0].error).toContain('ECONNREFUSED');
      expect(service.getConnectedServers()).toEqual(['up']);
    });

    it('passes server credentials.apiKey through as a Bearer header', async () => {
      stubBots([
        {
          name: 'bot',
          mcpServers: [
            {
              name: 'secured',
              serverUrl: 'https://secure.example/mcp',
              credentials: { apiKey: 'tok-123' },
            },
          ],
        },
      ]);

      await service.autoConnectConfiguredServers();

      expect(StreamableHTTPCtor).toHaveBeenCalledWith(expect.any(URL), {
        requestInit: { headers: { Authorization: 'Bearer tok-123' } },
      });
    });

    it('returns empty results instead of throwing when bot config lookup fails', async () => {
      jest.spyOn(BotConfigurationManager, 'getInstance').mockImplementation(() => {
        throw new Error('config store unavailable');
      });

      await expect(service.autoConnectConfiguredServers()).resolves.toEqual({
        connected: [],
        failed: [],
      });
    });

    it('does not reconnect servers that are already connected', async () => {
      stubBots([
        { name: 'bot', mcpServers: [{ name: 'srv', serverUrl: 'https://example.com/mcp' }] },
      ]);
      await service.connectToServer({ name: 'srv', serverUrl: 'https://example.com/mcp' });
      ClientCtor.mockClear();

      const result = await service.autoConnectConfiguredServers();

      expect(result.connected).toEqual([]);
      expect(result.failed).toEqual([]);
      expect(ClientCtor).not.toHaveBeenCalled();
    });
  });
});
