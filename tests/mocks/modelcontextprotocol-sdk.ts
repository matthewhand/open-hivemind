/**
 * Mock for @modelcontextprotocol/sdk
 *
 * The real SDK is an optional dependency that is not installed.
 * This mock is wired via moduleNameMapper in jest.config.js so that
 * `require('@modelcontextprotocol/sdk')` inside McpToolProvider resolves
 * here during tests.
 */

const mockConnect = jest.fn().mockResolvedValue(undefined);
const mockListTools = jest.fn().mockResolvedValue({ tools: [] });
const mockCallTool = jest.fn().mockResolvedValue({ content: 'ok', isError: false });

const MockClient = jest.fn().mockImplementation(() => ({
  connect: mockConnect,
  listTools: mockListTools,
  callTool: mockCallTool,
}));

export { MockClient as Client, mockConnect, mockListTools, mockCallTool, MockClient };
