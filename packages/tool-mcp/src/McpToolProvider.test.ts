/**
 * Tests for McpToolProvider connection wiring.
 *
 * These assert the regression fix for `mcp-sdk-require-toolprovider`: the
 * provider must import the MCP SDK from its real subpath entry points and call
 * `client.connect(transport)` with a constructed transport object (NOT the old
 * broken `require('@modelcontextprotocol/sdk')` + `connect({ url, apiKey })`).
 *
 * The SDK is mocked via jest.config.js moduleNameMapper -> tests/mocks/
 * modelcontextprotocol-sdk.ts for both the root and `/client/*` subpaths.
 */

// Pull the shared SDK mock spies. Each SDK subpath resolves to this same mock
// module via jest.config.js, so importing any one of them yields the spies.
import {
  Client as MockClient,
  mockConnect,
  mockListTools,
  SSEClientTransport,
  StdioClientTransport,
  StreamableHTTPClientTransport,
} from '@modelcontextprotocol/sdk/client/index.js';
import { McpToolProvider } from './McpToolProvider';

const Client = MockClient as unknown as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('McpToolProvider connection', () => {
  it('connects using an SSE transport and the constructed transport object', async () => {
    const provider = new McpToolProvider({
      name: 'test-sse',
      serverUrl: 'https://example.com/mcp',
      transport: 'sse',
      apiKey: 'secret-key',
    });

    await provider.listTools();

    // Client constructed with name/version metadata.
    expect(Client).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Open-Hivemind-test-sse', version: '1.0.0' })
    );

    // SSE transport built from the server URL with the API key as a Bearer header.
    expect(SSEClientTransport).toHaveBeenCalledTimes(1);
    const [urlArg, optsArg] = (SSEClientTransport as unknown as jest.Mock).mock.calls[0];
    expect(urlArg).toBeInstanceOf(URL);
    expect((urlArg as URL).href).toBe('https://example.com/mcp');
    expect(optsArg).toEqual({
      requestInit: { headers: { Authorization: 'Bearer secret-key' } },
    });

    // connect() is called with the transport object, not { url, apiKey }.
    expect(mockConnect).toHaveBeenCalledTimes(1);
    const connectArg = mockConnect.mock.calls[0][0];
    expect(connectArg).toMatchObject({ kind: 'sse' });
    expect(connectArg).not.toHaveProperty('apiKey');

    expect(mockListTools).toHaveBeenCalled();
  });

  it('uses a streamable-http transport when configured', async () => {
    const provider = new McpToolProvider({
      name: 'test-http',
      serverUrl: 'https://example.com/mcp',
      transport: 'streamable-http',
    });

    await provider.listTools();

    expect(StreamableHTTPClientTransport).toHaveBeenCalledTimes(1);
    expect(SSEClientTransport).not.toHaveBeenCalled();
    const connectArg = mockConnect.mock.calls[0][0];
    expect(connectArg).toMatchObject({ kind: 'streamable-http' });
  });

  it('uses a stdio transport with the configured command', async () => {
    const provider = new McpToolProvider({
      name: 'test-stdio',
      serverUrl: 'stdio://noop',
      transport: 'stdio',
      command: 'my-mcp-server',
    });

    await provider.listTools();

    expect(StdioClientTransport).toHaveBeenCalledWith(
      expect.objectContaining({ command: 'my-mcp-server' })
    );
    const connectArg = mockConnect.mock.calls[0][0];
    expect(connectArg).toMatchObject({ kind: 'stdio' });
  });

  it('omits the auth header when no API key is provided', async () => {
    const provider = new McpToolProvider({
      name: 'test-noauth',
      serverUrl: 'https://example.com/mcp',
      transport: 'sse',
    });

    await provider.listTools();

    const [, optsArg] = (SSEClientTransport as unknown as jest.Mock).mock.calls[0];
    expect(optsArg).toEqual({ requestInit: undefined });
  });

  it('throws a descriptive error when connection fails', async () => {
    mockConnect.mockRejectedValueOnce(new Error('boom'));

    const provider = new McpToolProvider({
      name: 'test-fail',
      serverUrl: 'https://example.com/mcp',
      transport: 'sse',
    });

    await expect(provider.listTools()).rejects.toThrow(/Failed to connect to MCP server test-fail/);
  });
});
