/**
 * URL-scheme-based MCP transport selection.
 *
 * A single MCP server "URL" field is used across the codebase (bot
 * `mcpServers[].serverUrl`, the admin `/api/mcp/servers` store, …). The scheme
 * of that URL decides which MCP SDK client transport is used:
 *
 * | Scheme                      | Transport                       | Target                       |
 * |-----------------------------|---------------------------------|------------------------------|
 * | `stdio://<command>`         | StdioClientTransport            | the local command to spawn   |
 * | `http://` / `https://`      | StreamableHTTPClientTransport   | the URL as-is                |
 * | `sse+http://` / `sse+https://` | SSEClientTransport (legacy)  | rewritten to http(s)://      |
 * | `sse://`                    | SSEClientTransport (legacy)     | rewritten to https:// (TLS by default) |
 *
 * Streamable HTTP is the modern MCP remote transport; SSE is the deprecated
 * legacy transport that some servers still speak, hence the explicit `sse`
 * scheme prefixes for opting into it.
 *
 * This module is intentionally pure (no SDK imports) so transport selection
 * can be unit-tested without loading the ESM-only MCP SDK.
 */

export type McpTransportKind = 'stdio' | 'sse' | 'streamable-http';

export interface ResolvedMcpTransport {
  /** Which SDK client transport to instantiate. */
  kind: McpTransportKind;
  /**
   * Transport target: the command to spawn for `stdio`, or the normalized
   * `http(s)://` URL for the network transports.
   */
  target: string;
}

/**
 * Resolves an MCP server URL to a transport kind + target.
 *
 * @throws {Error} if the URL uses an unsupported scheme.
 */
export function resolveMcpTransport(serverUrl: string): ResolvedMcpTransport {
  const url = (serverUrl ?? '').trim();

  if (url.startsWith('stdio://')) {
    const command = url.slice('stdio://'.length);
    if (!command) {
      throw new Error(`Invalid stdio MCP server URL (no command): ${serverUrl}`);
    }
    return { kind: 'stdio', target: command };
  }

  if (url.startsWith('sse+http://')) {
    return { kind: 'sse', target: `http://${url.slice('sse+http://'.length)}` };
  }
  if (url.startsWith('sse+https://')) {
    return { kind: 'sse', target: `https://${url.slice('sse+https://'.length)}` };
  }
  if (url.startsWith('sse://')) {
    // Bare sse:// defaults to TLS; use sse+http:// to opt into plaintext.
    return { kind: 'sse', target: `https://${url.slice('sse://'.length)}` };
  }

  if (url.startsWith('http://') || url.startsWith('https://')) {
    return { kind: 'streamable-http', target: url };
  }

  throw new Error(
    `Unsupported MCP server URL scheme: ${serverUrl}. ` +
      'Supported schemes: stdio://, http://, https://, sse://, sse+http://, sse+https://'
  );
}
