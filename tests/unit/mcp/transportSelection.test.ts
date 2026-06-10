/**
 * URL-scheme -> MCP transport selection (src/mcp/transportSelection.ts).
 *
 * This pure helper is the single source of truth for which SDK client
 * transport a server URL maps to; it is shared by MCPService and the admin
 * /api/mcp/servers connect path (src/server/routes/mcp/shared.ts). The
 * `/api/mcp/servers` path used to be stdio:// only — these tests pin the
 * http/https (Streamable HTTP) and sse:// (legacy SSE) support.
 */

import { resolveMcpTransport } from '@src/mcp/transportSelection';

describe('resolveMcpTransport', () => {
  it('maps stdio:// to the stdio transport with the command as target', () => {
    expect(resolveMcpTransport('stdio:///usr/local/bin/my-mcp')).toEqual({
      kind: 'stdio',
      target: '/usr/local/bin/my-mcp',
    });
  });

  it('maps http:// and https:// to the streamable-http transport, URL unchanged', () => {
    expect(resolveMcpTransport('http://localhost:3001/mcp')).toEqual({
      kind: 'streamable-http',
      target: 'http://localhost:3001/mcp',
    });
    expect(resolveMcpTransport('https://api.example.com/mcp')).toEqual({
      kind: 'streamable-http',
      target: 'https://api.example.com/mcp',
    });
  });

  it('maps sse:// to the SSE transport over https (TLS by default)', () => {
    expect(resolveMcpTransport('sse://api.example.com/sse')).toEqual({
      kind: 'sse',
      target: 'https://api.example.com/sse',
    });
  });

  it('maps sse+http:// and sse+https:// to the SSE transport over the given scheme', () => {
    expect(resolveMcpTransport('sse+http://localhost:3001/sse')).toEqual({
      kind: 'sse',
      target: 'http://localhost:3001/sse',
    });
    expect(resolveMcpTransport('sse+https://api.example.com/sse')).toEqual({
      kind: 'sse',
      target: 'https://api.example.com/sse',
    });
  });

  it('trims surrounding whitespace before matching', () => {
    expect(resolveMcpTransport('  https://api.example.com/mcp ')).toEqual({
      kind: 'streamable-http',
      target: 'https://api.example.com/mcp',
    });
  });

  it('rejects unsupported schemes with an actionable error', () => {
    expect(() => resolveMcpTransport('ftp://example.com')).toThrow(
      /Unsupported MCP server URL scheme: ftp:\/\/example\.com/
    );
    expect(() => resolveMcpTransport('not-a-url')).toThrow(/Unsupported MCP server URL scheme/);
  });

  it('rejects a stdio:// URL with no command', () => {
    expect(() => resolveMcpTransport('stdio://')).toThrow(/no command/);
  });
});
