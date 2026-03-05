# OpenAPI Specification Reference

Navigation: [Docs Index](../README.md) | [API Overview](../monitoring/api.md)

---

## Overview

Open-Hivemind provides a comprehensive REST API for configuration, monitoring, and bot management. The API follows OpenAPI 3.0.3 specification and can be accessed at:

- **JSON**: `/api/openapi.json`
- **YAML**: `/api/openapi.yaml`
- **Interactive UI**: `/api/docs` (if enabled)

## Base URL

```
http://localhost:3028
```

## Authentication

Most endpoints require authentication via Bearer token:

```bash
# Include in request header
Authorization: Bearer <your-token>
```

### Getting a Token

```bash
# Login to get access token
curl -X POST http://localhost:3028/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "your-password"}'
```

Response:
```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 3600,
  "user": {
    "id": "admin",
    "username": "admin",
    "role": "admin"
  }
}
```

---

## Common Endpoints

### Health & Status

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Basic health check |
| GET | `/api/health/detailed` | Detailed health status |
| GET | `/api/health/metrics` | System metrics |
| GET | `/api/health/ready` | Readiness probe |
| GET | `/api/health/live` | Liveness probe |

#### Response Examples

**Basic Health Check**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00Z",
  "uptime": 3600
}
```

**Detailed Health**
```json
{
  "status": "healthy",
  "components": {
    "database": "connected",
    "discord": "connected",
    "llm": "ready"
  },
  "metrics": {
    "memory": "128MB",
    "cpu": "12%"
  }
}
```

---

### Configuration

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/config` | Get sanitized configuration |
| GET | `/api/config/bots` | List all configured bots |
| GET | `/api/config/sources` | List configuration sources |
| GET | `/api/config/llm-status` | Get LLM configuration status |
| GET | `/api/config/llm-profiles` | List all LLM profiles |
| PUT | `/api/config/llm-profiles/:key` | Update LLM profile |
| PUT | `/api/config/global` | Update global configuration |

#### GET /api/config/bots

```bash
curl http://localhost:3028/api/config/bots \
  -H "Authorization: Bearer <token>"
```

Response:
```json
{
  "bots": [
    {
      "name": "bot1",
      "MESSAGE_PROVIDER": "discord",
      "LLM_PROVIDER": "openai",
      "PERSONA": "helpful",
      "isActive": true
    }
  ]
}
```

#### PUT /api/config/global

```bash
curl -X PUT http://localhost:3028/api/config/global \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "MESSAGE_RATE_LIMIT_PER_CHANNEL": 20,
    "MESSAGE_WAKEWORDS": "!help,!ping,@bot"
  }'
```

---

### Bot Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/bots` | List all bots with status |
| POST | `/api/bots` | Create a new bot |
| PUT | `/api/bots/:id` | Update a bot |
| DELETE | `/api/bots/:id` | Delete a bot |
| POST | `/api/bots/:id/clone` | Clone a bot |
| POST | `/api/bots/:id/start` | Start a bot |
| POST | `/api/bots/:id/stop` | Stop a bot |
| GET | `/api/bots/:id/history` | Get chat history |
| GET | `/api/bots/:id/activity` | Get activity logs |

#### Create a Bot

```bash
curl -X POST http://localhost:3028/api/bots \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-bot",
    "MESSAGE_PROVIDER": "discord",
    "LLM_PROVIDER": "openai",
    "PERSONA": "helpful"
  }'
```

#### Bot Response

```json
{
  "id": "bot-123",
  "name": "my-bot",
  "status": "running",
  "messageProvider": "discord",
  "llmProvider": "openai",
  "persona": "helpful",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

---

### Activity & Monitoring

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/activity/messages` | Get filtered messages |
| GET | `/api/activity/llm-usage` | Get LLM usage metrics |
| GET | `/api/activity/summary` | Get activity summary |
| GET | `/api/activity/chart-data` | Get time-series chart data |
| GET | `/api/activity/agents` | Get agent statistics |
| GET | `/api/activity/mcp-tools` | Get MCP tool usage |

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `bot` | string | Filter by bot name (comma-separated) |
| `messageProvider` | string | Filter by provider (discord, slack, mattermost) |
| `llmProvider` | string | Filter by LLM (openai, flowise, openwebui) |
| `from` | ISO datetime | Start of time range |
| `to` | ISO datetime | End of time range |
| `limit` | number | Max results (default: 100) |
| `offset` | number | Pagination offset |

#### Example Request

```bash
curl "http://localhost:3028/api/activity/messages?from=2024-01-01T00:00:00Z&to=2024-01-15T23:59:59Z&bot=bot1&limit=50" \
  -H "Authorization: Bearer <token>"
```

---

### Personas

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/personas` | List all personas |
| GET | `/api/personas/:id` | Get specific persona |
| POST | `/api/personas` | Create new persona |
| PUT | `/api/personas/:id` | Update persona |
| DELETE | `/api/personas/:id` | Delete persona |
| POST | `/api/personas/:id/clone` | Clone persona |

#### Create Persona

```bash
curl -X POST http://localhost:3028/api/personas \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "helpful-assistant",
    "description": "A friendly and helpful assistant",
    "systemInstruction": "You are a helpful AI assistant. Be concise and friendly.",
    "metadata": {
      "category": "general",
      "version": "1.0"
    }
  }'
```

---

### MCP Servers

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/mcp/servers` | List all MCP servers |
| POST | `/api/mcp/servers` | Add new MCP server |
| POST | `/api/mcp/servers/:name/connect` | Connect to server |
| POST | `/api/mcp/servers/:name/disconnect` | Disconnect from server |
| DELETE | `/api/mcp/servers/:name` | Remove server |
| GET | `/api/mcp/servers/:name/tools` | Get server tools |
| POST | `/api/mcp/servers/:name/call-tool` | Execute a tool |

#### Add MCP Server

```bash
curl -X POST http://localhost:3028/api/mcp/servers \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "filesystem",
    "url": "http://localhost:3001",
    "apiKey": "optional-key"
  }'
```

#### Call MCP Tool

```bash
curl -X POST http://localhost:3028/api/mcp/servers/filesystem/call-tool \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "read_file",
    "arguments": {
      "path": "/path/to/file.txt"
    }
  }'
```

---

### Guards

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/guards` | List all guards |
| POST | `/api/guards` | Create/update guard |
| POST | `/api/guards/:id/toggle` | Toggle guard status |

#### Guard Configuration

```bash
curl -X POST http://localhost:3028/api/guards \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "owner-only",
    "enabled": true,
    "description": "Only bot owner can use tools"
  }'
```

---

### Admin Operations

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/tool-usage-guards` | List tool guards |
| POST | `/api/admin/tool-usage-guards` | Create tool guard |
| PUT | `/api/admin/tool-usage-guards/:id` | Update tool guard |
| DELETE | `/api/admin/tool-usage-guards/:id` | Delete tool guard |
| GET | `/api/admin/llm-providers` | List LLM providers |
| POST | `/api/admin/llm-providers` | Create LLM provider |
| GET | `/api/admin/mcp-servers/test` | Test MCP connection |
| GET | `/api/admin/env-overrides` | Get env overrides |
| GET | `/api/admin/system-info` | Get system info |

---

### Errors

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/errors/frontend` | Report frontend error |
| GET | `/api/errors/stats` | Get error statistics |
| GET | `/api/errors/recent` | Get recent errors |

---

## Error Responses

All endpoints may return error responses in the following format:

### 400 Bad Request
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "name",
      "message": "Name is required"
    }
  ]
}
```

### 401 Unauthorized
```json
{
  "error": "Invalid or missing authentication token"
}
```

### 403 Forbidden
```json
{
  "error": "Insufficient permissions to perform this action"
}
```

### 404 Not Found
```json
{
  "error": "Resource not found",
  "resource": "bot",
  "id": "non-existent-id"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "requestId": "req-123-abc"
}
```

---

## Rate Limiting

API endpoints are subject to rate limiting:

| Endpoint Type | Limit |
|---------------|-------|
| Read operations | 100/minute |
| Write operations | 30/minute |
| Configuration changes | 10/minute |

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705312800
```

---

## WebSocket API

Real-time updates are available via WebSocket:

```javascript
// Connect to WebSocket
const ws = new WebSocket('ws://localhost:3028/webui/socket.io');

// Subscribe to bot events
ws.emit('subscribe', { channel: 'bot-events' });

// Listen for events
ws.on('bot-status', (data) => {
  console.log('Bot status changed:', data);
});
```

---

## SDK Examples

### JavaScript/TypeScript

```typescript
import { ApiClient } from '@open-hivemind/api-client';

const client = new ApiClient({
  baseUrl: 'http://localhost:3028',
  token: 'your-token'
});

// Get bots
const bots = await client.bots.list();

// Create bot
const newBot = await client.bots.create({
  name: 'my-bot',
  MESSAGE_PROVIDER: 'discord',
  LLM_PROVIDER: 'openai'
});
```

### Python

```python
import requests

BASE_URL = "http://localhost:3028"
HEADERS = {"Authorization": "Bearer your-token"}

# Get bots
response = requests.get(f"{BASE_URL}/api/bots", headers=HEADERS)
bots = response.json()

# Create bot
response = requests.post(
    f"{BASE_URL}/api/bots",
    headers=HEADERS,
    json={
        "name": "my-bot",
        "MESSAGE_PROVIDER": "discord",
        "LLM_PROVIDER": "openai"
    }
)
```

### cURL

```bash
# List bots
curl -X GET http://localhost:3028/api/bots \
  -H "Authorization: Bearer your-token"

# Update config
curl -X PUT http://localhost:3028/api/config/global \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{"MESSAGE_RATE_LIMIT_PER_CHANNEL": 15}'
```

---

## Versioning

The API uses URL-based versioning:

- **v1** (current): `/api/*`

Future versions will be at `/api/v2/*`, etc.

---

## Testing the API

### Using Swagger UI

Navigate to `/api/docs` (if enabled) for an interactive API explorer.

### Using OpenAPI Spec

```bash
# Get JSON spec
curl http://localhost:3028/api/openapi.json > openapi.json

# Validate with Redocly
npx @redocly/cli lint openapi.json

# Generate client
npx @openapi-generator/cli generate -i openapi.json -g typescript-axios -o ./api-client
```
