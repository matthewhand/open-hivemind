# Type Safety Roadmap

> **Purpose**: Catalog all `as unknown` type casts in the codebase, propose proper interface types, and define parallelizable work units for the agentic coding fleet.

## Status: In Progress

**Last updated**: 2026-02-22  
**Total `as unknown` casts found**: ~100+ across ~30 files  
**Existing type infrastructure**: `src/types/errors.ts` provides `HivemindError`, `ErrorUtils`, and type guard functions

---

## Pattern Categories

The casts fall into **6 repeating patterns**. Each pattern has a single recommended fix strategy that can be applied independently across files.

| # | Pattern | Instances | Fix Strategy | Difficulty |
|---|---------|-----------|--------------|------------|
| 1 | [HivemindError property access](#1-hiveminderror-property-access) | ~20 | Use `ErrorUtils` helpers | Easy |
| 2 | [Config/service module access](#2-configservice-module-access) | ~10 | Use proper getter types | Medium |
| 3 | [BotInfo / `getAllBots()` assertions](#3-botinfo--getallbots-assertions) | ~8 | Define `IBotInfo` interface | Medium |
| 4 | [Message type coercion](#4-message-type-coercion) | ~12 | Use existing type guards | Easy |
| 5 | [Constructor / singleton resets](#5-constructor--singleton-resets) | ~5 | Type-safe reset patterns | Easy |
| 6 | [Test mock / SDK compatibility casts](#6-test-mock--sdk-compatibility-casts) | ~15 | Type-safe mocks | Hard |

---

## 1. HivemindError Property Access

**Problem**: `ErrorUtils.toHivemindError(error)` returns `HivemindError`, but code casts it `as unknown` then accesses `.message`, `.code`, `.statusCode` directly.

**Fix**: Use `ErrorUtils.getMessage()`, `ErrorUtils.getCode()`, `ErrorUtils.getStatusCode()` instead of direct property access.

**Proposed interface** (already exists in `src/types/errors.ts`):
```typescript
// Already defined — just use the helpers:
ErrorUtils.getMessage(hivemindError)  // instead of hivemindError.message
ErrorUtils.getCode(hivemindError)     // instead of hivemindError.code
ErrorUtils.getStatusCode(hivemindError) // instead of hivemindError.statusCode
```

### Files to update

| File | Lines | Cast Pattern |
|------|-------|--------------|
| `src/integrations/slack/SlackBot.ts` | 47, 64, 81 | `ErrorUtils.toHivemindError(error) as unknown` |
| `src/integrations/slack/SlackEventListener.ts` | 75 | `ErrorUtils.toHivemindError(error) as unknown` |
| `src/integrations/slack/SlackBotManager.ts` | 80, 269 | `(hivemindError as unknown as Record<string, unknown>).code` |
| `src/integrations/slack/SlackEventProcessor.ts` | 135, 233, 263, 285 | `(hivemindError as unknown as Record<string, unknown>).code` |
| `src/integrations/slack/SlackMessageProcessor.ts` | 152, 194, 245 | `(hivemindError as unknown as Record<string, unknown>).code` |
| `src/common/ErrorUtils.ts` | 29 | `(error as unknown).code` |
| `src/utils/errorResponse.ts` | 190 | `(error.details as unknown).response` |

---

## 2. Config/Service Module Access

**Problem**: Dynamic imports or loosely typed config objects are cast `as unknown` to access methods or properties.

**Fix**: Define proper interfaces for the config accessor and service singletons.

**Proposed interface**:
```typescript
// NEW: src/types/configAccessor.ts
export interface IConfigAccessor {
  get(key: string): string | undefined;
  getAll(): Record<string, string>;
}
```

### Files to update

| File | Lines | Cast Pattern |
|------|-------|--------------|
| `src/llm/getLlmProvider.ts` | 99 | `llmConfig.get('LLM_PROVIDER') as unknown` |
| `src/integrations/mattermost/MattermostService.ts` | 347 | `(messageConfig as unknown).get(...)` |
| `src/config/messageConfig.ts` | various | config value typed as `unknown` |
| `src/integrations/slack/SlackEventListener.ts` | 32 | `'configuration' as unknown` |

---

## 3. BotInfo / `getAllBots()` Assertions

**Problem**: `getAllBots()` returns untyped arrays, so consumers cast elements `as unknown as BotInfo`.

**Fix**: Define and export an `IBotInfo` interface, and type `getAllBots()` return accordingly.

**Proposed interface**:
```typescript
// NEW or MODIFY: src/types/botInfo.ts or src/integrations/slack/types.ts
export interface IBotInfo {
  botUserId?: string;
  webClient?: WebClient;  // from @slack/web-api
  config?: {
    discord?: { token: string };
    token?: string;
    signingSecret?: string;
    name?: string;
  };
}
```

### Files to update

| File | Lines | Cast Pattern |
|------|-------|--------------|
| `src/admin/adminRoutes.ts` | 68–69, 228, 279–280 | `(Discord as unknown).DiscordService.getInstance()`, `bots as unknown[]` |
| `src/integrations/slack/modules/ISlackMessageIO.ts` | 179, 243, 346 | `bots[0] as unknown as BotInfo` |
| `src/integrations/slack/modules/ISlackBotFacade.ts` | 33 | `botInfo as unknown as { botUserId?; webClient? }` |
| `src/integrations/slack/SlackService.ts` | 989, 999 | `new (SlackBotManager as unknown)(...)`, `{} as unknown as SlackBotManager` |

---

## 4. Message Type Coercion

**Problem**: Messages from different sources are coerced between types (e.g., `SlackMessage`, `IMessage`, generic history objects).

**Fix**: Use the existing type guard functions (e.g., `isSlackMessage()`, `isDiscordMessage()`) or define adapter functions.

**Proposed approach**:
```typescript
// Use guards from src/types/slack.ts and src/types/discord.ts
import { isSlackEventData } from '@src/types/slack';

// Instead of: message as unknown as SlackMessage
// Use:
if (isSlackMessage(message)) { /* message is now SlackMessage */ }
```

### Files to update

| File | Lines | Cast Pattern |
|------|-------|--------------|
| `src/integrations/slack/SlackService.ts` | 406, 452, 463 | `message as unknown as SlackMessage`, `historyMessages as unknown as IMessage[]` |
| `src/integrations/slack/events/SlackMessageHandler.ts` | 101 | `historyMessages as unknown as IMessage[]` |
| `src/integrations/openwebui/directClient.ts` | 35 | `h as unknown as { role?: string }` |
| `src/integrations/slack/SlackSignatureVerifier.ts` | 49 | `req as unknown as { rawBody?: string }` |
| `src/integrations/slack/SlackWelcomeHandler.ts` | 346 | `options as unknown as Parameters<...>` |

---

## 5. Constructor / Singleton Resets

**Problem**: Singleton reset patterns use `null as unknown` to bypass the type system.

**Fix**: Type the singleton field as `T | null` and test with proper null checks.

### Files to update

| File | Lines | Cast Pattern |
|------|-------|--------------|
| `src/utils/TimerRegistry.ts` | 301 | `TimerRegistry.instance = null as unknown` |
| `src/utils/PerformanceProfiler.ts` | 194, 238 | `{} as unknown` for metric results |

---

## 6. Test Mock / SDK Compatibility Casts

**Problem**: Test files, mock setups, and SDK adapters (e.g., `fetch`, Slack SDK) use `as unknown` to bridge incompatible types.

**Fix**: Use `jest.Mock` typing, proper SDK type generics, or create typed adapter functions.

### Files to update

| File | Lines | Cast Pattern |
|------|-------|--------------|
| `src/services/ApiMonitorService.ts` | 11, 15 | `fetch as unknown as FetchImplementation` |
| `src/common/logger.ts` | 67 | `error as unknown as Record<string, unknown>` |
| `src/common/StructuredLogger.ts` | 73 | `error as unknown as Record<string, unknown>` |
| `src/integrations/slack/modules/ISlackMessageIO.ts` | 79 | `next as unknown as Promise<unknown>` |
| Various route files | multiple | `(statuses as any)[provider.id]` patterns |

---

## Remaining `unknown` in Type Definitions (Lower Priority)

These are **intentional** uses of `unknown` in type definitions where the actual runtime type varies. These are lower priority and may not need changes:

- `src/types/errors.ts` — `data?: unknown`, `request?: unknown` in error types
- `src/types/discord.ts` — `client: unknown`, `data?: unknown`
- `src/types/messages.ts` — `[key: string]: unknown` index signatures
- `src/types/mcp.ts` — `data?: unknown`

---

## Work Unit Breakdown (for Agentic Fleet)

Each work unit is **independent** and can be assigned to a separate agent. Units are ordered by dependency (do #1 first as it establishes the pattern).

| Unit | Scope | Files | Estimated Changes | Depends On |
|------|-------|-------|-------------------|------------|
| **WU-1** | ErrorUtils pattern (Slack) | 5 Slack files | ~15 lines each | None |
| **WU-2** | ErrorUtils pattern (common) | `ErrorUtils.ts`, `errorResponse.ts` | ~5 lines each | None |
| **WU-3** | Config accessor interface | `getLlmProvider.ts`, `MattermostService.ts`, `SlackEventListener.ts` | New interface + ~3 files | None |
| **WU-4** | BotInfo interface | `adminRoutes.ts`, `ISlackMessageIO.ts`, `ISlackBotFacade.ts` | New interface + ~4 files | None |
| **WU-5** | Message type guards | `SlackService.ts`, `SlackMessageHandler.ts`, `directClient.ts` | ~10 lines each | None |
| **WU-6** | Singleton resets | `TimerRegistry.ts`, `PerformanceProfiler.ts` | ~3 lines each | None |
| **WU-7** | SDK/mock adapters | `ApiMonitorService.ts`, `logger.ts`, `StructuredLogger.ts` | ~5 lines each | None |
| **WU-8** | Route handler returns | All route files in `src/server/routes/` | Add `return` before `res.json()` | None |

### Agent Instructions Template

For each work unit, provide agents with:

```
TASK: Fix `as unknown` type casts in [FILE LIST]
PATTERN: [Pattern #N from TYPE_SAFETY_ROADMAP.md]
RULE: Replace `as unknown` with proper types. Use ErrorUtils helpers for error handling.
       Do NOT introduce `any` - use the proposed interfaces or type guards instead.
VERIFY: Run `npx tsc --noEmit` on modified files to confirm no new errors.
```

---

## Verification Plan

After all work units are complete:

```bash
# Full type check
npx tsc --noEmit

# Lint check
npm run lint

# Test suite
npm test
```

### Success Criteria

- [ ] Zero `as unknown` casts in non-test files (except intentional SDK bridging)
- [ ] All `ErrorUtils.toHivemindError()` callers use helper methods
- [ ] New `IBotInfo` interface exported and consumed by all bot-related modules
- [ ] All Express route handlers consistently `return res.json(...)` or `return res.status(...).json(...)`
- [ ] `npx tsc --noEmit` passes with zero errors
