# MCP Tool Preferences

This document describes the MCP Tool Preferences feature, which allows users to enable or disable individual MCP tools and persists these preferences across sessions.

## Overview

The Tool Preferences feature provides:
- Persistent storage of tool enabled/disabled state
- Backend enforcement of disabled tools during execution
- API endpoints for managing preferences
- Automatic loading of preferences on page mount
- Bulk enable/disable operations

## Architecture

### Backend Components

1. **ToolPreferencesService** (`/src/server/services/ToolPreferencesService.ts`)
   - Singleton service for managing tool preferences
   - Stores preferences in `/data/tool-preferences.json`
   - Provides methods for CRUD operations on preferences
   - Debounced file saving for performance

2. **API Endpoints** (`/src/server/routes/mcp.ts`)
   - `POST /api/mcp/tools/:id/toggle` - Toggle individual tool
   - `POST /api/mcp/tools/bulk-toggle` - Bulk enable/disable tools
   - `GET /api/mcp/tools/:id/preference` - Get tool preference
   - `GET /api/mcp/tools/preferences` - Get all preferences
   - `GET /api/mcp/tools/preferences/stats` - Get preference statistics

3. **Validation Schemas** (`/src/validation/schemas/mcpSchema.ts`)
   - `ToggleToolSchema` - Validates individual toggle requests
   - `BulkToggleToolsSchema` - Validates bulk toggle requests
   - `GetToolPreferenceSchema` - Validates preference fetch requests

### Frontend Components

1. **MCPToolsPage** (`/src/client/src/pages/MCPToolsPage.tsx`)
   - Loads tool preferences on mount
   - Calls backend API when toggling tools
   - Updates local state after successful API calls
   - Shows success/error alerts

## Usage

### Toggling a Tool

**API Request:**
```bash
POST /api/mcp/tools/server1-tool1/toggle
Content-Type: application/json

{
  "enabled": false,
  "serverName": "server1",
  "toolName": "tool1",
  "userId": "optional-user-id"
}
```

**API Response:**
```json
{
  "success": true,
  "data": {
    "toolId": "server1-tool1",
    "serverName": "server1",
    "toolName": "tool1",
    "enabled": false,
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "updatedBy": "optional-user-id"
  },
  "message": "Tool disabled successfully"
}
```

### Bulk Toggle

**API Request:**
```bash
POST /api/mcp/tools/bulk-toggle
Content-Type: application/json

{
  "tools": [
    { "toolId": "server1-tool1", "serverName": "server1", "toolName": "tool1" },
    { "toolId": "server1-tool2", "serverName": "server1", "toolName": "tool2" }
  ],
  "enabled": false,
  "userId": "optional-user-id"
}
```

**API Response:**
```json
{
  "success": true,
  "data": [
    {
      "toolId": "server1-tool1",
      "serverName": "server1",
      "toolName": "tool1",
      "enabled": false,
      "updatedAt": "2024-01-01T00:00:00.000Z"
    },
    {
      "toolId": "server1-tool2",
      "serverName": "server1",
      "toolName": "tool2",
      "enabled": false,
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "message": "2 tools disabled successfully"
}
```

### Getting Tool Preference

**API Request:**
```bash
GET /api/mcp/tools/server1-tool1/preference
```

**API Response (when preference exists):**
```json
{
  "success": true,
  "data": {
    "toolId": "server1-tool1",
    "serverName": "server1",
    "toolName": "tool1",
    "enabled": false,
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "isDefault": false
  }
}
```

**API Response (when preference doesn't exist):**
```json
{
  "success": true,
  "data": {
    "toolId": "server1-tool1",
    "enabled": true,
    "isDefault": true
  }
}
```

### Getting All Preferences

**API Request:**
```bash
GET /api/mcp/tools/preferences
```

**API Response:**
```json
{
  "success": true,
  "data": {
    "server1-tool1": {
      "toolId": "server1-tool1",
      "serverName": "server1",
      "toolName": "tool1",
      "enabled": false,
      "updatedAt": "2024-01-01T00:00:00.000Z"
    },
    "server1-tool2": {
      "toolId": "server1-tool2",
      "serverName": "server1",
      "toolName": "tool2",
      "enabled": true,
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

### Getting Statistics

**API Request:**
```bash
GET /api/mcp/tools/preferences/stats
```

**API Response:**
```json
{
  "success": true,
  "data": {
    "totalPreferences": 4,
    "enabledCount": 2,
    "disabledCount": 2,
    "serverCounts": {
      "server1": { "enabled": 1, "disabled": 1 },
      "server2": { "enabled": 1, "disabled": 1 }
    }
  }
}
```

## Tool Execution Enforcement

When a tool is disabled, any attempt to execute it will be rejected with a 403 status:

**Tool Execution Request:**
```bash
POST /api/mcp/servers/server1/call-tool
Content-Type: application/json

{
  "toolName": "tool1",
  "arguments": {}
}
```

**Error Response (if tool is disabled):**
```json
{
  "error": "Tool is disabled",
  "code": "TOOL_DISABLED",
  "toolId": "server1-tool1",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Data Storage

Tool preferences are stored in `/data/tool-preferences.json`:

```json
{
  "preferences": {
    "server1-tool1": {
      "toolId": "server1-tool1",
      "serverName": "server1",
      "toolName": "tool1",
      "enabled": false,
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "updatedBy": "user123"
    }
  },
  "lastUpdated": "2024-01-01T00:00:00.000Z"
}
```

## Default Behavior

- If no preference exists for a tool, it defaults to **enabled**
- The `isToolEnabled()` method returns `true` by default
- Tools are considered enabled if their server is connected and no preference overrides this

## Testing

The feature includes comprehensive test coverage:

- **Unit Tests:** `/tests/unit/server/services/ToolPreferencesService.test.ts`
  - Tests all service methods
  - Tests singleton pattern
  - Tests data persistence

- **API Tests:** `/tests/api/mcp-tool-preferences.test.ts`
  - Tests all API endpoints
  - Tests validation schemas
  - Tests error handling

## Future Enhancements

Potential improvements to consider:
- User-specific preferences (multi-user support)
- Tool preference history/audit log
- Bulk operations by server
- Import/export preferences
- UI for managing preferences in bulk
