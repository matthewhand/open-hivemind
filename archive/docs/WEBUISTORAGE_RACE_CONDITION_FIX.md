# WebUIStorage Race Condition Fix

## Summary
Fixed a race condition in `src/storage/webUIStorage.ts` where multiple concurrent requests could cause duplicate guard initialization. Replaced busy-wait loop with proper async-mutex pattern.

## Changes Made

### 1. `src/storage/webUIStorage.ts`
**Problem**: The `getGuards()` method used a busy-wait loop (`while (this.guardsInitializationInProgress)`) which:
- Consumed CPU resources unnecessarily
- Could cause infinite loops or hangs
- Was not a proper concurrency control mechanism

**Solution**:
- Imported `async-mutex` library (already in package.json)
- Added private `guardsMutex: Mutex` to class
- Replaced busy-wait loop with `await mutex.acquire()` / `release()` pattern
- Made `getGuards()` async (returns `Promise<any[]>`)
- Added comprehensive JSDoc comments explaining concurrency control
- Improved guard merging logic to be more efficient

**Key improvements**:
```typescript
// Before: Busy-wait loop
while (this.guardsInitializationInProgress) {
  const config = this.loadConfig();
  if (config.guards && config.guards.length > 0) {
    return config.guards;
  }
}

// After: Proper mutex-based concurrency control
const release = await this.guardsMutex.acquire();
try {
  // ... initialization logic ...
  return config.guards;
} finally {
  release();
}
```

### 2. `src/server/routes/guards.ts`
**Changes**:
- Updated all route handlers to `async` to handle the new async `getGuards()`
- Added `await` to all `webUIStorage.getGuards()` calls
- Fixed TypeScript errors by properly handling `error instanceof Error` checks

**Modified routes**:
- `GET /` - Get all guards
- `POST /` - Update access control guard config
- `POST /:id/toggle` - Toggle guard enabled status

### 3. Tests Created

#### Unit Tests: `tests/unit/storage/webUIStorage.test.ts`
Comprehensive test suite with 18 tests covering:
- Constructor and initialization
- Config loading and caching
- Config saving and error handling
- Guard initialization with mutex-based concurrency control
- Concurrent access (10 and 100 simultaneous calls)
- Mixed concurrent operations
- File system error handling

**Test Results**:
```
✓ 18 tests passing
✓ webUIStorage.ts coverage: 45.58% statements, 45.65% branches, 31.42% functions
```

**Key test**: "should handle 100 concurrent getGuards calls correctly"
- Validates that mutex prevents race conditions
- Ensures guards are initialized exactly once
- Confirms all concurrent callers receive consistent data

#### E2E Tests: `tests/e2e/guards-concurrent-access.spec.ts`
Playwright tests covering:
- Multiple simultaneous guard operations without race conditions
- Rapid toggle operations
- Guard initialization under concurrent load
- Screenshot generation showing guards page under load

## Verification

### Linting
```bash
npm run lint
# Only pre-existing warnings about 'any' types in interface
```

### TypeScript Compilation
```bash
npx tsc --project tsconfig.json --noEmit
# No errors in modified files
```

### Unit Tests
```bash
npm test -- tests/unit/storage/webUIStorage.test.ts
# All 18 tests passing
```

### E2E Tests
```bash
npx playwright test tests/e2e/guards-concurrent-access.spec.ts --project=chromium
# Note: Requires full dependency installation and server running
```

## Performance Impact
- **Before**: Busy-wait loops consumed CPU cycles
- **After**: Proper async/await with mutex - zero CPU consumption while waiting
- **Concurrency**: Handles 100+ concurrent requests safely

## Breaking Changes
- `getGuards()` is now async and returns `Promise<any[]>`
- Callers must use `await webUIStorage.getGuards()`

## Coverage Improvement
- webUIStorage.ts: Increased from ~0% to 45.58% statement coverage
- All critical paths tested including race condition scenarios

## Files Modified
1. `src/storage/webUIStorage.ts` - Core race condition fix
2. `src/server/routes/guards.ts` - Updated to handle async getGuards()
3. `tests/unit/storage/webUIStorage.test.ts` - Comprehensive unit tests (NEW)
4. `tests/e2e/guards-concurrent-access.spec.ts` - E2E concurrency tests (NEW)

## Related Issues
- Fixes potential hangs when multiple requests hit guards endpoint simultaneously
- Eliminates busy-wait pattern anti-pattern
- Improves overall system stability under load
