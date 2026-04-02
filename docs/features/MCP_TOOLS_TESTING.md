# MCP Tools Testing Feature

## Overview

The MCP Tools Testing UI provides an interactive interface for testing Model Context Protocol (MCP) tools before integrating them into bots. This feature allows administrators to:

1. Browse all available MCP tools from connected servers
2. View detailed tool schemas including parameter types and descriptions
3. Generate dynamic forms based on tool input schemas
4. Execute tools with custom parameters
5. View execution results with syntax highlighting
6. Monitor execution time and handle errors

## Files Created

### Frontend Components
- **src/client/src/pages/MCPToolsTestingPage.tsx** - Main testing interface component

### Backend Routes
- **src/server/routes/mcpToolsTesting.ts** - API endpoints for listing tools and executing tests

### Tests
- **tests/unit/client/pages/MCPToolsTestingPage.test.tsx** - Unit tests for form generation and display
- **tests/e2e/screenshot-mcp-tools-testing.spec.ts** - End-to-end tests with screenshot capture

## Routes

### Frontend Route
- `/admin/mcp/tools/testing` - Main testing interface

### API Endpoints

#### GET /api/admin/mcp-tools/list
List all available MCP tools from connected servers.

**Response:**
```json
{
  "success": true,
  "data": {
    "tools": [
      {
        "id": "server-name-tool-name",
        "name": "tool_name",
        "description": "Tool description",
        "serverId": "server-name",
        "serverName": "server-name",
        "inputSchema": {...},
        "outputSchema": {...}
      }
    ],
    "totalServers": 2,
    "connectedServers": 2
  }
}
```

#### POST /api/admin/mcp-tools/test
Execute a tool with provided parameters.

**Request Body:**
```json
{
  "serverName": "Weather Service",
  "toolName": "get_weather",
  "arguments": {
    "city": "San Francisco",
    "units": "celsius",
    "days": 5
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "result": {...},
    "executionTime": 245,
    "timestamp": "2026-03-30T05:00:00.000Z"
  }
}
```

## Features

### Dynamic Form Generation
The UI automatically generates appropriate form fields based on the tool's input schema:

- **String fields** - Text inputs
- **Integer/Number fields** - Number inputs
- **Boolean fields** - Toggle switches
- **Array/Object fields** - JSON text areas with validation

### Schema Display
The input schema is displayed in a formatted code block showing:
- Property names and types
- Required vs optional fields
- Field descriptions
- Type constraints

### Result Display
Test results are displayed with:
- Success/failure status indicator
- Execution time in milliseconds
- JSON-formatted output with syntax highlighting
- Error messages for failed executions
- Timestamp of execution

### Error Handling
Comprehensive error handling includes:
- Connection failures
- Invalid parameters
- Tool execution errors
- JSON parsing errors
- Network timeouts

## Usage Example

1. Navigate to `/admin/mcp/tools/testing`
2. Select a tool from the "Available Tools" sidebar
3. View the tool's schema and description
4. Fill in the parameter form with test values
5. Click "Test Tool" to execute
6. Review the results including output and execution time

## Screenshot

The screenshot for this feature will be generated at:
- `docs/screenshots/mcp-tools-testing.png`

Run `npm run generate-docs` to capture the screenshot.

## Integration Points

- Reuses existing `/api/mcp/servers` endpoint for tool discovery
- Reuses existing `/api/mcp/servers/:name/call-tool` endpoint for execution
- Integrates with MCP Provider Manager for server connectivity
- Uses DaisyUI components for consistent styling

## Testing

### Unit Tests
Run unit tests with:
```bash
npm test -- tests/unit/client/pages/MCPToolsTestingPage.test.tsx
```

Tests cover:
- Tool listing and display
- Dynamic form field generation
- Tool selection
- Execution and result display
- Error handling

### E2E Tests
Run e2e tests with:
```bash
npm run test:playwright -- tests/e2e/screenshot-mcp-tools-testing.spec.ts
```

Tests cover:
- Complete user workflow
- Different parameter types
- Successful executions
- Error scenarios
- Empty states
- Screenshot capture

## Future Enhancements

Potential improvements:
1. Save and reuse test configurations
2. Test history with results cache
3. Batch testing multiple tools
4. Export test results to JSON
5. Parameter validation before execution
6. Auto-fill with example values from schema
7. Compare results across multiple executions
