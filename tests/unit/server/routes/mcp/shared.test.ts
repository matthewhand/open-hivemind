/**
 * Transport selection in the admin /api/mcp/servers connect path
 * (src/server/routes/mcp/shared.ts connectToMCPServer).
 *
 * This path was stdio:// only — any http(s) or SSE URL was rejected with
 * "Unsupported MCP server URL scheme". These tests pin the new scheme-based
 * selection: stdio:// -> StdioClientTransport, http(s):// ->
 * StreamableHTTPClientTransport, sse:// / sse+http(s):// -> SSEClientTransport.
 *
 * The MCP SDK is ESM-only (dynamic import()), so the tests stub the exported
 * `mcpSdk.load` seam rather than mocking the SDK modules — same pattern as the
 * MCPService.loadSdk seam in tests/unit/mcp/MCPService.test.ts.
 */

import {
  connectedClients,
  connectToMCPServer,
  mcpSdk,
  type MCPServer,
} from '@src/server/routes/mcp/shared';

const mockConnect = jest.fn().mockResolvedValue(undefined);
const mockListTools = jest.fn().mockResolvedValue({
  tools: [{ name: 'echo', description: 'Echoes', inputSchema: {} }],
});
const ClientCtor = jest.fn().mockImplementation(() => ({
  connect: mockConnect,
  listTools: mockListTools,
}));
const StreamableHTTPCtor = jest.fn().mockImplementation((url: URL) => ({ __kind: 'http', url }));
const SSECtor = jest.fn().mockImplementation((url: URL) => ({ __kind: 'sse', url }));
const StdioCtor = jest.fn().mockImplementation((opts: unknown) => ({ __kind: 'stdio', opts }));

const server = (overrides: Partial<MCPServer>): MCPServer => ({
  name: 'test-server',
  url: 'stdio://noop',
  connected: false,
  ...overrides,
});

describe('connectToMCPServer transport selection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    connectedClients.clear();
    jest.spyOn(mcpSdk, 'load').mockResolvedValue({
      Client: ClientCtor,
      StreamableHTTPClientTransport: StreamableHTTPCtor,
      SSEClientTransport: SSECtor,
      StdioClientTransport: StdioCtor,
    } as unknown as Awaited<ReturnType<typeof mcpSdk.load>>);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    connectedClients.clear();
  });

  it('uses the stdio transport for stdio:// URLs', async () => {
    const result = await connectToMCPServer(server({ url: 'stdio://my-mcp-binary' }));

    expect(StdioCtor).toHaveBeenCalledWith({ command: 'my-mcp-binary', args: [] });
    expect(mockConnect).toHaveBeenCalledWith(expect.objectContaining({ __kind: 'stdio' }));
    expect(result.server.connected).toBe(true);
    expect(result.server.tools).toEqual([{ name: 'echo', description: 'Echoes', inputSchema: {} }]);
    expect(connectedClients.has('test-server')).toBe(true);
  });

  it('uses the Streamable HTTP transport for http(s):// URLs (no longer stdio-only)', async () => {
    await connectToMCPServer(server({ url: 'https://api.example.com/mcp', apiKey: 'secret' }));

    expect(StreamableHTTPCtor).toHaveBeenCalledTimes(1);
    const [urlArg, optsArg] = StreamableHTTPCtor.mock.calls[0];
    expect((urlArg as URL).href).toBe('https://api.example.com/mcp');
    expect(optsArg).toEqual({ requestInit: { headers: { Authorization: 'Bearer secret' } } });
    expect(mockConnect).toHaveBeenCalledWith(expect.objectContaining({ __kind: 'http' }));
    expect(connectedClients.has('test-server')).toBe(true);
  });

  it('omits the Authorization header when no apiKey is configured', async () => {
    await connectToMCPServer(server({ url: 'http://localhost:3001/mcp' }));

    const [, optsArg] = StreamableHTTPCtor.mock.calls[0];
    expect(optsArg).toEqual({ requestInit: undefined });
  });

  it('uses the SSE transport for sse:// URLs (https by default)', async () => {
    await connectToMCPServer(server({ url: 'sse://api.example.com/sse', apiKey: 'tok' }));

    expect(SSECtor).toHaveBeenCalledTimes(1);
    const [urlArg, optsArg] = SSECtor.mock.calls[0];
    expect((urlArg as URL).href).toBe('https://api.example.com/sse');
    expect(optsArg).toEqual({ requestInit: { headers: { Authorization: 'Bearer tok' } } });
    expect(StreamableHTTPCtor).not.toHaveBeenCalled();
    expect(mockConnect).toHaveBeenCalledWith(expect.objectContaining({ __kind: 'sse' }));
  });

  it('uses the SSE transport over plaintext http for sse+http:// URLs', async () => {
    await connectToMCPServer(server({ url: 'sse+http://localhost:3001/sse' }));

    const [urlArg] = SSECtor.mock.calls[0];
    expect((urlArg as URL).href).toBe('http://localhost:3001/sse');
  });

  it('rejects unsupported schemes and does not register a client', async () => {
    await expect(connectToMCPServer(server({ url: 'ftp://example.com' }))).rejects.toThrow(
      /Unsupported MCP server URL scheme/
    );
    expect(connectedClients.has('test-server')).toBe(false);
  });
});
