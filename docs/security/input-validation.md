# Input Validation

This document describes the input validation strategy used in Open Hivemind to prevent injection attacks and data corruption.

## Overview

Open Hivemind uses a multi-layered validation approach:

1. **Schema validation** with Zod at API boundaries
2. **Sanitization middleware** for request data
3. **Type safety** via TypeScript
4. **Database parameterization** to prevent SQL injection

## Zod Schema Validation

### What Zod Validates

Zod schemas validate all incoming API requests, ensuring:
- Required fields are present
- Data types are correct (string, number, boolean, etc.)
- String lengths are within acceptable ranges
- Enum values are from allowed sets
- Nested objects match expected structure
- Arrays contain valid elements

### Schema Locations

All validation schemas are located in `/src/validation/schemas/`:

```
src/validation/schemas/
├── adminSchema.ts          # Admin user management endpoints
├── agentsSchema.ts         # Agent configuration
├── botsSchema.ts          # Bot configuration and management
├── configSchema.ts        # System configuration
├── guardsSchema.ts        # Tool usage guard rules
├── mcpSchema.ts           # MCP server integration
├── personasSchema.ts      # Bot personas
└── ...                    # Additional schemas
```

### Example Schema

```typescript
// From src/validation/schemas/botsSchema.ts
export const createBotSchema = z.object({
  name: z.string().min(1).max(100),
  messageProvider: z.enum(['slack', 'discord', 'telegram', 'mattermost']),
  llmProvider: z.string().min(1),
  channelId: z.string().optional(),
  config: z.record(z.any()).optional(),
});
```

## Validation Middleware

### Where Validation Happens

Validation occurs at multiple points in the request lifecycle:

1. **Route-level validation** (`/src/server/middleware/validate.ts`)
   - Applied to specific endpoints via `validateRequest()` middleware
   - Validates request body, query params, and path params
   - Returns 400 Bad Request with detailed error messages on failure

2. **Global sanitization** (`/src/server/middleware/security.ts`)
   - Applied to ALL requests via `sanitizeInput()` middleware
   - Strips dangerous characters and patterns from:
     - Query parameters
     - Request body
     - Headers (selective - excludes auth headers)
     - Cookies

3. **Application-level sanitization** (`/src/common/security/inputSanitizer.ts`)
   - Used by business logic for additional sanitization
   - Provides specialized sanitizers for:
     - Message text
     - User names
     - Email addresses
     - File names
     - User/channel IDs

### Sanitization Rules

The global sanitization middleware (`sanitizeInput()`) performs the following:

**Query Parameters:**
```typescript
// Removes: < > ' " &
const sanitized = value.replace(/[<>'"&]/g, '');
```

**Request Body:**
```typescript
// Strips:
// - <script> tags
// - <iframe> tags
// - javascript: URIs
// - Event handlers (onclick=, onload=, etc.)
obj[key] = value
  .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
  .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
  .replace(/javascript:/gi, '')
  .replace(/on\w+\s*=/gi, '');
```

**Important:** The middleware does NOT HTML-encode characters like `<`, `>`, `&`, `'`, `"` in request bodies because this would corrupt legitimate API data (URLs with query parameters, JSON strings, etc.). Instead, it strips known dangerous patterns while preserving data integrity.

## Endpoints with Validation

### Protected Endpoints

The following endpoint categories use Zod validation:

- **Admin endpoints** (`/api/admin/*`)
  - User management
  - Role assignment
  - System configuration

- **Bot management** (`/api/bots/*`)
  - Create/update/delete bots
  - Bot configuration
  - Persona assignment

- **Guard configuration** (`/api/guards/*`)
  - Tool usage rules
  - Guard profiles
  - Permission policies

- **MCP integration** (`/api/mcp/*`)
  - Server registration
  - Tool configuration
  - Provider settings

- **Configuration** (`/api/config/*`)
  - System settings
  - Provider configuration
  - Import/export

### Endpoints Lacking Validation

Some legacy endpoints may not have comprehensive Zod validation:

- **Health checks** (`/api/health`) - Simple status endpoints
- **Static file serving** - Handled by Express static middleware
- **WebSocket connections** - Message validation happens in handlers

**Action Required:** These endpoints should be audited and schemas added where appropriate.

## SQL Injection Prevention

### Parameterized Queries

All database queries use parameterized statements via the `sqlite` library:

```typescript
// SAFE: Parameters passed as array
await db.run(
  'INSERT INTO messages (messageId, channelId, content) VALUES (?, ?, ?)',
  [messageId, channelId, content]
);

// SAFE: Named parameters
await db.run(
  'UPDATE bot_configurations SET name = :name WHERE id = :id',
  { ':name': name, ':id': id }
);
```

### String Concatenation for Table Names

In a few cases, table names are concatenated into SQL strings:

```typescript
// From src/database/dao/BotConfigurationDAO.ts
const totalRow = await this.db.get('SELECT COUNT(*) as total FROM ' + this.tableName);
```

**Why this is safe:**
- `this.tableName` is a hardcoded constant (`'bot_configurations'`), not user input
- SQL does not support parameterized table names
- Table names cannot contain spaces or special characters in SQLite

### Audit Results

**No SQL injection vulnerabilities found.** All user-supplied values are properly parameterized.

## NoSQL Injection

Open Hivemind does not currently use NoSQL databases (MongoDB, Redis, etc.) for primary data storage. If NoSQL is added in the future:

- Use ORM/ODM libraries with built-in injection protection
- Validate all query operators
- Avoid constructing queries from user input strings
- Use schema validation for all documents

## Command Injection Prevention

### Safe Command Execution

All command execution uses `execFile()` or `spawn()` with argument arrays:

```typescript
// SAFE: Using execFile with argument array (no shell)
const execFilePromise = util.promisify(execFile);
await execFilePromise(command, args, {
  shell: false,  // Critical: prevents shell interpretation
  timeout: 30000,
});
```

### Validation Before Execution

When user input is used in commands (e.g., port numbers), it's validated first:

```typescript
// From src/integrations/openswarm/SwarmInstaller.ts
const portNum = Number(port);
if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
  throw new Error('Invalid port number');
}
// Safe to use portNum.toString() in spawn()
```

### Audit Results

**No command injection vulnerabilities found.** All command execution:
- Uses `execFile()` or `spawn()` (not `exec()`)
- Passes arguments as arrays (not shell strings)
- Validates user input before use

## XSS Prevention

### Frontend Sanitization

React provides XSS protection by default through automatic escaping. However, two instances use `dangerouslySetInnerHTML`:

**Location:** `src/client/src/components/ToolResultModal.tsx`

**Purpose:** Syntax highlighting for JSON tool results

**Safety:**
- Input is passed through `JSON.stringify()` first, which escapes all HTML special characters
- Only predefined `<span>` tags with CSS classes are added
- No user-supplied HTML is rendered

See code comments in the file for detailed security analysis.

### Content Security Policy (CSP)

CSP headers prevent inline script execution:

```
script-src 'self' 'unsafe-inline' 'unsafe-eval'
```

**Why `'unsafe-eval'` is present:**
- Required for Vite's dynamic `import()` in development
- Required for React's Hot Module Replacement (HMR)
- Maintained for MCP plugin dynamic loading

**Mitigation:** All user input is sanitized before storage/rendering.

See `/src/server/middleware/security.ts` for full CSP configuration and rationale.

## Recommendations

### Short-term

1. **Add Zod validation to remaining endpoints**
   - Health check endpoints
   - Static file upload endpoints
   - Any custom WebSocket message types

2. **Audit file upload handling**
   - Validate MIME types
   - Scan for malicious content
   - Limit file sizes
   - Store uploads outside webroot

3. **Rate limiting**
   - Already implemented in `/src/server/middleware/security.ts`
   - Consider per-endpoint limits for sensitive operations

### Long-term

1. **Consider removing `'unsafe-eval'` from CSP**
   - Profile production builds to verify Vite doesn't use `eval()`
   - Test MCP plugin loading without `'unsafe-eval'`
   - May require plugin architecture changes

2. **Implement request signing**
   - For API-to-API communication
   - For webhook endpoints
   - Prevents replay attacks

3. **Add input validation testing**
   - Automated fuzzing tests
   - Known XSS/injection payload tests
   - Regression tests for security fixes

## Testing Validation

### Manual Testing

Test validation by sending malicious payloads:

```bash
# Test XSS protection
curl -X POST http://localhost:3000/api/bots \
  -H "Content-Type: application/json" \
  -d '{"name": "<script>alert(1)</script>"}'
# Should sanitize script tags

# Test SQL injection
curl -X GET "http://localhost:3000/api/bots?id=1' OR '1'='1"
# Should parameterize query, not execute injection

# Test command injection
curl -X POST http://localhost:3000/api/integrations/openswarm/start \
  -H "Content-Type: application/json" \
  -d '{"port": "8000; rm -rf /"}'
# Should validate port as number, reject malicious input
```

### Automated Testing

See `/tests/security/` for automated validation tests.

## References

- [OWASP Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
- [Zod Documentation](https://zod.dev/)
- [SQLite Prepared Statements](https://www.sqlite.org/lang_expr.html#parameters)
- [Node.js Child Process Security](https://nodejs.org/api/child_process.html#spawning-bat-and-cmd-files-on-windows)
