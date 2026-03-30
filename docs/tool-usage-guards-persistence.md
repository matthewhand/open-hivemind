# Tool Usage Guards Persistence Implementation

## Overview

This document describes the persistence implementation for the tool-usage-guards endpoints in the admin API. Previously, these endpoints returned hardcoded mock data. Now, they persist guards to disk and provide full CRUD operations.

## Architecture

### Components

1. **ToolUsageGuardsManager** (`src/managers/ToolUsageGuardsManager.ts`)
   - Singleton service that manages tool usage guards
   - Handles persistence to JSON file
   - Provides CRUD operations
   - Emits events for guard lifecycle changes

2. **Admin Routes** (`src/server/routes/admin.ts`)
   - REST API endpoints for managing guards
   - Uses ToolUsageGuardsManager for all operations
   - Provides proper error handling and validation

3. **Client Component** (`src/client/src/components/ToolUsageGuardsConfig.tsx`)
   - React component for managing guards via UI
   - Updated to match API data structure

## Data Structure

### ToolUsageGuard Interface

```typescript
interface ToolUsageGuard {
  id: string;                    // UUID generated on creation
  name: string;                  // Display name for the guard
  description?: string;          // Optional description
  toolId: string;                // ID of the tool to guard
  guardType: GuardType;          // Type of guard (see below)
  allowedUsers: string[];        // Array of allowed user IDs
  allowedRoles: string[];        // Array of allowed roles
  isActive: boolean;             // Whether guard is active
  createdAt: string;             // ISO timestamp
  updatedAt: string;             // ISO timestamp
}
```

### Guard Types

- `owner_only`: Only specific users (listed in allowedUsers) can use the tool
- `user_list`: Only users in the allowedUsers list can use the tool
- `role_based`: Only users with roles in allowedRoles can use the tool

## Storage

Guards are persisted to: `config/user/tool-usage-guards.json`

The file format is a JSON object where keys are guard IDs and values are ToolUsageGuard objects:

```json
{
  "550e8400-e29b-41d4-a716-446655440000": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Admin Only for Sensitive Tool",
    "description": "Restricts access to admin users",
    "toolId": "sensitive_tool",
    "guardType": "role_based",
    "allowedUsers": [],
    "allowedRoles": ["admin"],
    "isActive": true,
    "createdAt": "2026-03-29T10:00:00.000Z",
    "updatedAt": "2026-03-29T10:00:00.000Z"
  }
}
```

## API Endpoints

### GET /api/admin/tool-usage-guards

Retrieves all configured guards.

**Response:**
```json
{
  "success": true,
  "data": {
    "guards": [...]
  },
  "message": "Tool usage guards retrieved successfully"
}
```

### POST /api/admin/tool-usage-guards

Creates a new guard.

**Request Body:**
```json
{
  "name": "Admin Only",
  "description": "Optional description",
  "toolId": "my_tool",
  "guardType": "role_based",
  "allowedUsers": [],
  "allowedRoles": ["admin"],
  "isActive": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "guard": {...}
  },
  "message": "Tool usage guard created successfully"
}
```

### PUT /api/admin/tool-usage-guards/:id

Updates an existing guard.

**Request Body:** Same as POST

**Response:** Same structure as POST

### DELETE /api/admin/tool-usage-guards/:id

Deletes a guard.

**Response:**
```json
{
  "success": true,
  "message": "Tool usage guard deleted successfully"
}
```

### POST /api/admin/tool-usage-guards/:id/toggle

Toggles a guard's active status.

**Request Body:**
```json
{
  "isActive": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Tool usage guard status updated successfully"
}
```

## Usage Example

### Creating a Guard via API

```typescript
const response = await fetch('/api/admin/tool-usage-guards', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Admin Only Access',
    toolId: 'sensitive_operation',
    guardType: 'role_based',
    allowedRoles: ['admin'],
    isActive: true
  })
});
```

### Checking User Access

```typescript
import { ToolUsageGuardsManager } from './managers/ToolUsageGuardsManager';

const guardsManager = ToolUsageGuardsManager.getInstance();
const result = await guardsManager.isUserAllowedToUseTool(
  'user123',
  'sensitive_operation',
  ['user', 'developer'] // user's roles
);

if (result.allowed) {
  // Allow tool usage
} else {
  console.log(result.reason); // "Access denied: User does not have permission..."
}
```

## Server Startup

The ToolUsageGuardsManager uses lazy initialization via the singleton pattern. Guards are automatically loaded from disk when the manager is first accessed. No additional server startup code is required.

## Testing

A mock implementation is provided for unit tests in `tests/routes/admin.test.ts`. The mock maintains an in-memory Map of guards that persists across test operations within a test suite.

## Events

The ToolUsageGuardsManager emits the following events:

- `guardCreated`: Emitted when a new guard is created
- `guardUpdated`: Emitted when a guard is updated
- `guardDeleted`: Emitted when a guard is deleted
- `guardToggled`: Emitted when a guard's active status is toggled
- `guardsReloaded`: Emitted when guards are reloaded from disk

These events can be subscribed to for logging, auditing, or other purposes:

```typescript
const manager = ToolUsageGuardsManager.getInstance();
manager.on('guardCreated', (guard) => {
  console.log('New guard created:', guard);
});
```

## Future Enhancements

1. **Database Integration**: Move from JSON file storage to database (PostgreSQL, MongoDB, etc.)
2. **Guard Profiles**: Support for reusable guard profiles that can be applied to multiple tools
3. **Advanced Role Checks**: Integration with actual user role management system
4. **Audit Logging**: Track all guard enforcement actions
5. **Guard Testing**: UI for testing guards before activation
6. **Bulk Operations**: Support for applying guards to multiple tools at once
7. **Guard Templates**: Predefined guard templates for common use cases
8. **Dynamic Loading**: Hot-reload guards without server restart

## Migration from Mock Data

The previous implementation returned hardcoded mock data. With this implementation:

1. On first run, the guards file will be created (if it doesn't exist) as an empty object `{}`
2. The GET endpoint will return an empty array initially
3. Guards must be created via the POST endpoint or by manually editing the JSON file
4. The mock data from the previous implementation is no longer used

## Security Considerations

1. Guards file is stored in `config/user/` directory
2. Ensure proper file permissions on the guards file
3. API endpoints are protected by admin authentication middleware
4. Input validation is performed via Zod schemas
5. User IDs and roles should be validated against actual user management system
