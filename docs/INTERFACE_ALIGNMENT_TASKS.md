# Interface Alignment Tasks

**Status:** Ready for Delegation  
**Created:** 2026-02-22  
**Purpose:** Document misalignments between code and documentation, enabling parallel work by agentic coding fleet.

---

## Executive Summary

Three significant misalignments were identified between documentation and actual code implementation. Each task below is self-contained and can be executed independently by separate agents.

---

## Task 1: ILlmProvider Interface Alignment

### Misalignment Description

**Documentation Location:** [`AGENTS.md:70-76`](../AGENTS.md:70)

**Documented Interface (INCORRECT):**
```typescript
export interface ILlmProvider {
  generateResponse(message: Message, context?: IMessage[]): Promise<string>;
  validateCredentials(): Promise<boolean>;
}
```

**Actual Implementation:** [`src/llm/interfaces/ILlmProvider.ts`](../src/llm/interfaces/ILlmProvider.ts:27)

```typescript
export interface ILlmProvider {
  name: string;
  supportsChatCompletion: () => boolean;
  supportsCompletion: () => boolean;
  generateChatCompletion: (userMessage: string, historyMessages: IMessage[], metadata?: Record<string, unknown>) => Promise<string>;
  generateStreamingChatCompletion?: (userMessage: string, historyMessages: IMessage[], onChunk: (chunk: string) => void, metadata?: Record<string, unknown>) => Promise<string>;
  generateCompletion: (prompt: string) => Promise<string>;
}
```

### Remediation Options

#### Option A: Update Documentation Only
- [ ] Edit `AGENTS.md` lines 70-76 to reflect actual interface
- [ ] Update code examples to use `generateChatCompletion()` instead of `generateResponse()`
- [ ] Add documentation for `supportsChatCompletion()`, `supportsCompletion()`, `generateStreamingChatCompletion()`
- [ ] Update "Add a New LLM Provider" section with correct method signatures

#### Option B: Add Missing Interface Methods
- [ ] Add `validateCredentials(): Promise<boolean>` to `ILlmProvider` interface
- [ ] Implement in [`OpenAiProvider`](../packages/provider-openai/src/openAiProvider.ts)
- [ ] Implement in [`FlowiseProvider`](../src/integrations/flowise/flowiseProvider.ts)
- [ ] Implement in [`OpenWebUI`](../src/integrations/openwebui/openWebUIProvider.ts)
- [ ] Add `generateResponse()` as alias to `generateChatCompletion()` for backward compatibility
- [ ] Update AGENTS.md to document both old and new methods

#### Option C: Build Provider Health Check System
- [ ] Create `src/llm/ProviderHealthService.ts`
- [ ] Add method `checkProviderHealth(provider: ILlmProvider): Promise<HealthStatus>`
- [ ] Create `/api/webui/providers/health` endpoint in `src/server/routes/`
- [ ] Add health check to bot startup sequence in `BotManager`
- [ ] Add WebUI component showing provider status

### Files to Modify

| File | Action |
|------|--------|
| `AGENTS.md` | Update interface documentation |
| `src/llm/interfaces/ILlmProvider.ts` | Add methods (Option B) |
| `packages/provider-openai/src/openAiProvider.ts` | Implement new methods (Option B) |
| `src/integrations/flowise/flowiseProvider.ts` | Implement new methods (Option B) |
| `src/integrations/openwebui/openWebUIProvider.ts` | Implement new methods (Option B) |

### Acceptance Criteria
- [ ] Documentation matches actual interface
- [ ] All existing tests pass
- [ ] New methods have unit tests (if Option B/C chosen)

---

## Task 2: Discord Integration Path Alignment

### Misalignment Description

**Documentation Location:** [`AGENTS.md:57`](../AGENTS.md:57)

**Documented Path (INCORRECT):**
```
src/integrations/{discord,slack,mattermost}/
```

**Actual Structure:**
```
packages/adapter-discord/src/DiscordService.ts    # Main Discord implementation
packages/adapter-slack/src/SlackService.ts        # Main Slack implementation
packages/adapter-mattermost/src/MattermostService.ts  # Main Mattermost implementation

src/integrations/discord/                         # Only contains DiscordConnectionTest.ts
src/integrations/slack/                           # Contains SlackService + providers
src/integrations/mattermost/                      # Contains MattermostService
```

**Import Pattern Used:**
```typescript
import { Discord } from '@hivemind/adapter-discord';
import SlackService from '@integrations/slack/SlackService';
```

### Remediation Options

#### Option A: Update Documentation Only
- [ ] Change `src/integrations/{discord,slack,mattermost}/` to `packages/adapter-{discord,slack,mattermost}/`
- [ ] Update Key Files Reference table in AGENTS.md
- [ ] Add section explaining monorepo package architecture
- [ ] Document `@hivemind/adapter-*` import aliases

#### Option B: Create Re-export Shims
- [ ] Create `src/integrations/discord/index.ts`:
  ```typescript
  export { Discord, DiscordService, DiscordMessage } from '@hivemind/adapter-discord';
  ```
- [ ] Update imports in `src/admin/adminRoutes.ts` to use consistent paths
- [ ] Update imports in `src/mcp/MCPService.ts` to use consistent paths
- [ ] Update AGENTS.md to document both paths work

#### Option C: Build Integration Registry System
- [ ] Create `src/integrations/IntegrationRegistry.ts`
- [ ] Define `IIntegrationAdapter` interface
- [ ] Auto-discover adapters from `packages/adapter-*`
- [ ] Add `/api/webui/integrations` endpoint listing available adapters
- [ ] Add WebUI page showing installed integrations with status

### Files to Modify

| File | Action |
|------|--------|
| `AGENTS.md` | Update paths and add monorepo section |
| `src/integrations/discord/index.ts` | Create re-export shim (Option B) |
| `src/admin/adminRoutes.ts` | Update imports for consistency |
| `src/mcp/MCPService.ts` | Update imports for consistency |

### Acceptance Criteria
- [ ] Documentation reflects actual file locations
- [ ] All imports resolve correctly
- [ ] `npm run build` succeeds
- [ ] All existing tests pass

---

## Task 3: Analytics Module Documentation Cleanup

### Misalignment Description

**Documentation Location:** [`docs/ARCHITECTURE.md:64-67`](../docs/ARCHITECTURE.md:64)

**Documented Structure (OUTDATED):**
```
├── analytics/               # Analytics and usage tracking
│   ├── AnalyticsCollector.ts # Event tracking
│   ├── UsageTracker.ts       # User analytics
│   └── index.ts              # Analytics exports
```

**Actual Reality:**
- `src/analytics/` directory was **DELETED** in commit db45d26b (PR #142)
- The analytics module had zero imports and was completely unused
- This documentation section is now obsolete

### Remediation Required

- [ ] Remove the analytics section from `docs/ARCHITECTURE.md`
- [ ] Verify no other documentation references the deleted analytics module
- [ ] Update any architecture diagrams that may reference analytics

### Files to Modify

| File | Action |
|------|--------|
| `docs/ARCHITECTURE.md` | Remove analytics section from project structure |

### Acceptance Criteria
- [ ] Documentation no longer references non-existent analytics module
- [ ] All existing tests pass

---

## Coordination Notes for Agentic Fleet

### Parallel Execution Safety

| Task | Can Run Parallel With | Conflicts |
|------|----------------------|-----------|
| Task 1 | Task 2, Task 3 | None |
| Task 2 | Task 1, Task 3 | None |
| Task 3 | Task 1, Task 2 | None |

### Recommended Execution Order

1. **Task 1 (ILlmProvider)** - Documentation fix is quick, Option B adds value
2. **Task 2 (Discord paths)** - Documentation fix is straightforward
3. **Task 3 (Analytics)** - Remove outdated documentation references

### Testing Requirements

After any task completion:
```bash
npm run build      # Must succeed
npm run test       # Must pass
npm run lint       # Warnings allowed
```

### PR Naming Convention

```
docs: align ILlmProvider interface documentation
docs: update integration paths to reflect monorepo structure
docs: remove outdated analytics module documentation
```

---

## Quick Reference: Key Files

| Purpose | File Path |
|---------|-----------|
| LLM Provider Interface | `src/llm/interfaces/ILlmProvider.ts` |
| LLM Provider Factory | `src/llm/getLlmProvider.ts` |
| Discord Adapter Package | `packages/adapter-discord/src/DiscordService.ts` |
| Slack Integration | `packages/adapter-slack/src/SlackService.ts` |
| Agent Instructions | `AGENTS.md` |
| Architecture Docs | `docs/ARCHITECTURE.md` |
