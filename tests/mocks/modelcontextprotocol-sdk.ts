/**
 * Mock for @modelcontextprotocol/sdk
 *
 * The real SDK is an optional dependency that may not be installed in CI.
 * This mock is wired via moduleNameMapper in jest.config.js so that
 * imports of the SDK (root or client subpaths) inside McpToolProvider /
 * MCPService resolve here during tests.
 *
 * It deliberately covers both the legacy root entry point and the modern
 * subpath entry points (`/client/index.js`, `/client/sse.js`, etc.) that the
 * real SDK exposes, since jest.config.js maps all of them to this file.
 */

export const mockConnect = jest.fn().mockResolvedValue(undefined);
export const mockListTools = jest.fn().mockResolvedValue({ tools: [] });
export const mockCallTool = jest.fn().mockResolvedValue({ content: 'ok', isError: false });

export const MockClient = jest.fn().mockImplementation(() => ({
  connect: mockConnect,
  listTools: mockListTools,
  callTool: mockCallTool,
}));

export const SSEClientTransport = jest
  .fn()
  .mockImplementation((url: URL, opts?: unknown) => ({ kind: 'sse', url, opts }));

export const StreamableHTTPClientTransport = jest
  .fn()
  .mockImplementation((url: URL, opts?: unknown) => ({ kind: 'streamable-http', url, opts }));

export const StdioClientTransport = jest
  .fn()
  .mockImplementation((opts?: unknown) => ({ kind: 'stdio', opts }));

export { MockClient as Client };
