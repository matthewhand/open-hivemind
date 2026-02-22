# Lint & Test Fix Instructions for Agentic Coding Bot Fleet

## Overview

This document provides instructions for fixing lint errors in the Open-Hivemind codebase. There are **8859 lint problems** (7003 errors, 1856 warnings) across **283 files**. All tests currently pass.

## Quick Stats

| Metric | Count |
|--------|-------|
| Total Lint Problems | 8859 |
| Errors | 7003 |
| Warnings | 1856 |
| Auto-fixable | 1059 |
| Files Affected | 283 |
| Test Status | ✅ All Passing |

---

## Priority 1: Auto-Fixable Issues (1059 problems)

Run this first to eliminate low-hanging fruit:

```bash
npm run lint -- --fix
```

This will fix:
- **prettier/prettier** (584 occurrences) - Formatting issues
- Some **@typescript-eslint/no-inferrable-types** - Unnecessary type annotations

---

## Priority 2: Top 30 Files by Error Count

Focus on these files first for maximum impact:

| Errors | File |
|--------|------|
| 668 | `src/server/routes/config.ts` |
| 649 | `src/database/DatabaseManager.ts` |
| 359 | `src/message/handlers/messageHandler.ts` |
| 354 | `src/services/DemoModeService.ts` |
| 311 | `src/server/routes/mcp.ts` |
| 263 | `src/index.ts` |
| 253 | `src/server/routes/admin.ts` |
| 217 | `src/server/routes/validation.ts` |
| 212 | `src/server/routes/demo.ts` |
| 188 | `src/message/helpers/processing/shouldReplyToMessage.ts` |
| 181 | `src/database/MigrationManager.ts` |
| 180 | `src/admin/adminRoutes.ts` |
| 180 | `src/server/routes/importExport.ts` |
| 160 | `src/server/services/ConfigurationImportExportService.ts` |
| 148 | `src/server/routes/agents.ts` |
| 142 | `src/message/management/getMessengerProvider.ts` |
| 137 | `src/cli/HivemindCLI.ts` |
| 132 | `src/message/management/IdleResponseManager.ts` |
| 120 | `src/server/routes/template.ts` |
| 116 | `src/server/routes/health.ts` |
| 107 | `src/server/routes/botConfig.ts` |
| 99 | `src/database/dao/BotConfigurationDAO.ts` |
| 92 | `src/integrations/slack/modules/ISlackMessageIO.ts` |
| 90 | `src/config/SecureConfigManager.ts` |
| 90 | `src/config/messageConfig.ts` |
| 88 | `src/utils/errorLogger.ts` |
| 85 | `src/server/services/RealTimeValidationService.ts` |
| 84 | `src/config/HotReloadManager.ts` |
| 84 | `src/types/errorClasses.ts` |
| 79 | `src/server/services/WebSocketService.ts` |

---

## Priority 3: Fix by Error Type

### 3.1 @typescript-eslint/no-unsafe-member-access (2219 occurrences)

**Problem**: Accessing properties on `any` typed values without type checking.

**Pattern to fix**:
```typescript
// ❌ Before
const value = obj.someProperty;

// ✅ After - Use proper typing
interface MyType {
  someProperty: string;
}
const obj: MyType = getObj();
const value = obj.someProperty;

// ✅ Or use optional chaining with type guards
const value = (obj as { someProperty?: string })?.someProperty;
```

**Top files to fix**:
- `src/database/DatabaseManager.ts` (219 errors)
- `src/server/routes/config.ts` (215 errors)
- `src/message/handlers/messageHandler.ts` (116 errors)
- `src/server/routes/mcp.ts` (97 errors)
- `src/index.ts` (96 errors)

---

### 3.2 @typescript-eslint/no-unsafe-assignment (1533 occurrences)

**Problem**: Assigning `any` typed values to typed variables.

**Pattern to fix**:
```typescript
// ❌ Before
const result: MyType = someAnyValue;

// ✅ After - Add type assertion or validation
const result: MyType = someAnyValue as MyType;
// Or better, validate the shape
const result = validateAndCast<MyType>(someAnyValue);
```

**Top files to fix**:
- `src/database/DatabaseManager.ts` (189 errors)
- `src/server/routes/config.ts` (171 errors)
- `src/server/routes/mcp.ts` (104 errors)
- `src/server/routes/admin.ts` (87 errors)
- `src/server/routes/validation.ts` (74 errors)

---

### 3.3 @typescript-eslint/no-explicit-any (964 occurrences)

**Problem**: Using `any` type explicitly.

**Pattern to fix**:
```typescript
// ❌ Before
function process(data: any): any { ... }

// ✅ After - Use proper types or generics
function process<T>(data: T): T { ... }
// Or use unknown for truly unknown types
function process(data: unknown): Result { ... }
```

**Top files to fix**:
- `src/server/routes/config.ts` (71 errors)
- `src/server/routes/admin.ts` (33 errors)
- `src/server/routes/importExport.ts` (32 errors)
- `src/types/errorClasses.ts` (26 errors)
- `src/storage/webUIStorage.ts` (25 errors)

---

### 3.4 @typescript-eslint/prefer-nullish-coalescing (743 occurrences)

**Problem**: Using `||` instead of `??` for default values.

**Pattern to fix**:
```typescript
// ❌ Before
const value = input || 'default';

// ✅ After - Use nullish coalescing
const value = input ?? 'default';
```

**Note**: This rule requires `strictNullChecks` in tsconfig. Consider enabling it.

**Top files to fix**:
- `src/server/routes/config.ts` (77 errors)
- `src/admin/adminRoutes.ts` (41 errors)
- `src/server/routes/mcp.ts` (38 errors)
- `src/message/handlers/messageHandler.ts` (36 errors)
- `src/server/routes/admin.ts` (31 errors)

---

### 3.5 @typescript-eslint/no-unsafe-call (485 occurrences)

**Problem**: Calling functions with `any` typed values.

**Pattern to fix**:
```typescript
// ❌ Before
const result = someAnyFunction();

// ✅ After - Type the function
type MyFunction = () => string;
const result = (someAnyFunction as MyFunction)();
```

**Top files to fix**:
- `src/index.ts` (76 errors)
- `src/database/MigrationManager.ts` (73 errors)
- `src/message/handlers/messageHandler.ts` (41 errors)
- `src/message/helpers/processing/shouldReplyToMessage.ts` (32 errors)
- `src/message/management/getMessengerProvider.ts` (25 errors)

---

### 3.6 @typescript-eslint/no-unsafe-argument (456 occurrences)

**Problem**: Passing `any` typed values to typed parameters.

**Pattern to fix**:
```typescript
// ❌ Before
function accept(str: string) { ... }
accept(anyValue);

// ✅ After - Validate or cast
accept(String(anyValue));
// Or
accept(anyValue as string);
```

**Top files to fix**:
- `src/server/routes/config.ts` (46 errors)
- `src/message/handlers/messageHandler.ts` (34 errors)
- `src/database/DatabaseManager.ts` (31 errors)
- `src/types/errorClasses.ts` (24 errors)
- `src/server/routes/importExport.ts` (19 errors)

---

### 3.7 no-console (330 occurrences)

**Problem**: Using `console.log`, `console.error`, etc.

**Pattern to fix**:
```typescript
// ❌ Before
console.log('message');

// ✅ After - Use the Logger singleton
import { Logger } from '@src/common/Logger';
Logger.getInstance().info('message');
```

**Top files to fix**:
- `src/cli/HivemindCLI.ts` (82 errors) - CLI can keep console, add eslint-disable
- `src/monitoring/MonitoringService.ts` (26 errors)
- `src/server/ShutdownCoordinator.ts` (17 errors)
- `src/server/routes/validation.ts` (17 errors)
- `src/services/StartupLegendService.ts` (17 errors)

---

### 3.8 @typescript-eslint/no-unnecessary-type-assertion (231 occurrences)

**Problem**: Type assertions that don't change the type.

**Pattern to fix**:
```typescript
// ❌ Before
const str = 'hello' as string;

// ✅ After - Remove unnecessary assertion
const str = 'hello';
```

**Top files to fix**:
- `src/database/DatabaseManager.ts` (100 errors)
- `src/message/handlers/messageHandler.ts` (15 errors)
- `src/server/services/ConfigurationImportExportService.ts` (13 errors)
- `src/server/routes/template.ts` (12 errors)
- `src/message/management/getMessengerProvider.ts` (10 errors)

---

### 3.9 @typescript-eslint/no-unused-vars (186 occurrences)

**Problem**: Variables declared but never used.

**Pattern to fix**:
```typescript
// ❌ Before
const { used, unused } = getData();

// ✅ After - Remove or prefix with underscore
const { used } = getData();
// Or if intentionally unused
const { used, unused: _unused } = getData();
```

**Top files to fix**:
- `src/server/services/ConfigurationVersionService.ts` (16 errors)
- `src/server/routes/bots.ts` (11 errors)
- `src/server/routes/config.ts` (8 errors)
- `src/server/routes/botConfig.ts` (7 errors)
- `src/message/management/IdleResponseManager.ts` (6 errors)

---

### 3.10 @typescript-eslint/no-misused-promises (168 occurrences)

**Problem**: Passing async functions where void return is expected.

**Pattern to fix**:
```typescript
// ❌ Before
router.get('/path', async (req, res) => { ... });

// ✅ After - Wrap in void or use proper handler
router.get('/path', (req, res) => {
  void (async () => {
    // async code
  })();
});
// Or use express-async-handler
import asyncHandler from 'express-async-handler';
router.get('/path', asyncHandler(async (req, res) => { ... }));
```

**Top files to fix**:
- `src/admin/adminRoutes.ts` (multiple)
- `src/server/routes/admin.ts` (multiple)
- Various route files

---

## Recommended Approach

### Step 1: Run Auto-fix
```bash
npm run lint -- --fix
```

### Step 2: Enable strictNullChecks (Optional but Recommended)
Edit `tsconfig.json`:
```json
{
  "compilerOptions": {
    "strictNullChecks": true
  }
}
```

### Step 3: Tackle Files in Batches

**Batch 1 - Route Files** (High impact, similar patterns):
- `src/server/routes/config.ts`
- `src/server/routes/admin.ts`
- `src/server/routes/mcp.ts`
- `src/server/routes/validation.ts`
- `src/server/routes/demo.ts`

**Batch 2 - Database Layer**:
- `src/database/DatabaseManager.ts`
- `src/database/MigrationManager.ts`
- `src/database/dao/BotConfigurationDAO.ts`

**Batch 3 - Message Handling**:
- `src/message/handlers/messageHandler.ts`
- `src/message/helpers/processing/shouldReplyToMessage.ts`
- `src/message/management/getMessengerProvider.ts`

**Batch 4 - Core Services**:
- `src/index.ts`
- `src/services/DemoModeService.ts`
- `src/admin/adminRoutes.ts`

### Step 4: Run Tests After Each Batch
```bash
npm run test
```

---

## Useful Commands

```bash
# Run lint
npm run lint

# Auto-fix
npm run lint -- --fix

# Lint specific file
npm run lint -- src/server/routes/config.ts

# Run tests
npm run test

# Run specific test
npm run test -- --testPathPattern="config"

# Check TypeScript compilation
npm run build
```

---

## Notes

1. **CLI files** (`src/cli/HivemindCLI.ts`): Console statements are acceptable here. Add `// eslint-disable-next-line no-console` where appropriate.

2. **Route handlers**: Many have `@typescript-eslint/no-misused-promises`. Consider using `express-async-handler` wrapper.

3. **Database files**: Heavy use of `any` due to SQLite dynamic queries. Consider creating typed interfaces for query results.

4. **Config files**: Many `any` types due to dynamic configuration objects. Consider using zod or io-ts for schema validation.

---

## File Assignment Suggestion

If distributing work across multiple bots, assign by directory:

| Bot | Directory | Est. Errors |
|-----|-----------|-------------|
| Bot 1 | `src/server/routes/` | ~2500 |
| Bot 2 | `src/database/` | ~900 |
| Bot 3 | `src/message/` | ~800 |
| Bot 4 | `src/config/` | ~400 |
| Bot 5 | `src/integrations/` | ~300 |
| Bot 6 | `src/admin/`, `src/auth/`, `src/cli/` | ~500 |
| Bot 7 | `src/services/`, `src/utils/`, `src/types/` | ~600 |
| Bot 8 | Remaining files | ~500 |
