# @hivemind/tool-mcp

[Model Context Protocol](https://modelcontextprotocol.io) tool provider for Open Hivemind. Connects to MCP servers over stdio, SSE, or streamable-HTTP and exposes their tools to bots through the `IToolProvider` contract.

## Exports

- `McpToolProvider` — class implementing `IToolProvider`
- `McpToolProviderConfig`, `McpTransport` — config types
- `McpToolsListResponse`, `McpToolCallResponse` — raw SDK response shapes
- `manifest` — `{ displayName: 'MCP Tools', type: 'tool', ... }`
- `create(config)` — factory used by the PluginLoader. Throws if `config` is missing.

## Configuration (`McpToolProviderConfig`)

| Field | Required | Purpose |
|---|---|---|
| `name` | yes | Human-readable provider instance name. |
| `serverUrl` | yes | URL of the MCP server (used by `sse` and `streamable-http`). |
| `transport` | yes | One of `'stdio' \| 'sse' \| 'streamable-http'`. |
| `command` | stdio | Command to spawn the MCP server when `transport === 'stdio'`. |
| `apiKey` | optional | Bearer token for authenticated servers. |
| `timeout` | optional | Tool execution timeout in ms (default 30 000). |
| `autoReconnect` | optional | Reconnect on disconnect (default `true`). |

## Environment variables

None read directly. SSRF guards in `@hivemind/shared-types` validate `serverUrl` — set `ALLOW_LOCAL_NETWORK_ACCESS=true` (or `MCP_INTERNAL_CIDR_ALLOWLIST`) if the server is on a private network.

## Usage

```ts
import { create as createMcp } from '@hivemind/tool-mcp';

const provider = createMcp({
  name: 'my-mcp',
  serverUrl: 'https://mcp.example.com/sse',
  transport: 'sse',
  apiKey: process.env.MCP_API_KEY,
});

const tools = await provider.listTools();
const result = await provider.callTool(tools[0].name, { query: 'hello' });
```

## Tests

`npm test` is a stub. End-to-end coverage lives in `tests/tools/mcp/` in the main app.
