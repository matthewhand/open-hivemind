# MCP Server Integration

Navigation: [Docs Index](../README.md) | [Configuration Overview](../configuration/overview.md) | [Bot Management](../admin/bots.md)

---

## Overview

Model Context Protocol (MCP) servers extend Open-Hivemind with external tools and capabilities. MCP enables bots to connect to specialized services that provide additional functionality beyond built-in features.

## Supported Features

- **Tool Discovery**: Automatically discover tools available on connected MCP servers
- **Tool Execution**: Execute tools from MCP servers with proper authentication
- **Multi-server Support**: Connect to multiple MCP servers simultaneously
- **Access Controls**: Configure tool usage guards (owner-only, allowlist, or open)

## Setting Up MCP Servers

### Via WebUI (Recommended)

1. Navigate to **MCP Servers** in the admin sidebar
2. Click **Add Server**
3. Enter:
   - **Server Name**: Human-readable name for the server
   - **Server URL**: URL of the MCP server (e.g., `https://mcp.example.com`)
   - **API Key**: Authentication key (if required)
4. Click **Connect**

### Via Environment Variables

```bash
# MCP servers (comma-separated)
MCP_SERVERS=internal-tools,github-tools

# Per-server configuration
MCP_INTERNAL_TOOLS_URL=https://mcp.internal.example.com
MCP_INTERNAL_TOOLS_API_KEY=your-api-key

MCP_GITHUB_TOOLS_URL=https://mcp.github.example.com
MCP_GITHUB_TOOLS_API_KEY=ghp_xxx
```

## Tool Usage Guards

Control who can use MCP tools through configurable guards:

### Configuration Options

| Mode | Description |
|------|-------------|
| `off` | Anyone can use MCP tools |
| `owner` | Only the channel/forum owner can use MCP tools |
| `allowlist` | Only specified user IDs can use MCP tools |

### Setting Guard Defaults

```bash
# Global default (applied to all bots)
MCP_TOOL_GUARD_MODE=owner
MCP_TOOL_GUARD_ALLOWLIST=1234567890,9876543210
```

### Per-Bot Configuration

```bash
# Override for specific bot
BOTS_mybot_MCP_GUARD_MODE=allowlist
BOTS_mybot_MCP_GUARD_ALLOWLIST=1234567890
```

## Troubleshooting

### MCP Server Connection Failed

**Symptoms**:
- MCP tools not available
- Connection timeout or refused

**Solutions**:
1. **Verify URL**: Check `MCP_*_URL` is correct and accessible
2. **Check server status**: Verify MCP server is running
3. **Check authentication**: Verify API key is valid
4. **Network issues**: Ensure server can reach the MCP endpoint
5. **Reconnect**: Disconnect and reconnect in WebUI

### Tools Not Appearing

1. Verify server is connected (green status in WebUI)
2. Check server logs for tool discovery errors
3. Restart the MCP server to trigger re-discovery

### Permission Errors

If users get "Access Denied" errors:
1. Check `MCP_TOOL_GUARD_MODE` setting
2. Verify user ID is in `MCP_TOOL_GUARD_ALLOWLIST` (if using allowlist mode)
3. For owner mode, ensure user is the channel owner

## Available MCP Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/mcp/servers` | GET | List all MCP servers |
| `/api/mcp/servers` | POST | Add new MCP server |
| `/api/mcp/servers/:name/connect` | POST | Connect to server |
| `/api/mcp/servers/:name/disconnect` | POST | Disconnect from server |
| `/api/mcp/servers/:name/tools` | GET | Get server tools |
| `/api/mcp/servers/:name/call-tool` | POST | Execute a tool |

## Examples

### Connect to Filesystem MCP Server

```bash
MCP_FILESYSTEM_URL=http://localhost:3001
MCP_FILESYSTEM_API_KEY=optional-key
```

### Connect to GitHub MCP Server

```bash
MCP_GITHUB_URL=https://mcp.github.com
MCP_GITHUB_API_KEY=ghp_xxxxxxxxxxxx
```

## Further Reading

- [Swarm Troubleshooting](../configuration/swarm-troubleshooting.md)
- [Error Reference](../operations/error-reference.md)
- [API Reference](../reference/openapi-reference.md)
