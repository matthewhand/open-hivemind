# Open-Hivemind Interface Types & Development Roadmap

> **Last Updated**: 2026-02-22
> **Purpose**: This document provides a comprehensive reference for all interface types in the codebase and a prioritized roadmap for development work. It is designed to be used by agentic coding fleets to pick up well-scoped tasks.

---

## Table of Contents

1. [Core Interface Types](#core-interface-types)
2. [Platform Adapters](#platform-adapters)
3. [LLM Providers](#llm-providers)
4. [Frontend Types](#frontend-types)
5. [Development Roadmap](#development-roadmap)
6. [Task Templates for Agents](#task-templates-for-agents)

---

## Core Interface Types

### 1. IMessage (Abstract Base Class)
**Location**: [`packages/shared-types/src/IMessage.ts`](packages/shared-types/src/IMessage.ts)

The foundational message abstraction for all platforms.

```typescript
export abstract class IMessage {
  // Properties
  content: string;
  channelId: string;
  data: any;
  role: string; // "user" | "assistant" | "system" | "tool"
  platform: string;
  metadata?: any;
  tool_call_id?: string;
  tool_calls?: any[];

  // Abstract Methods (MUST implement)
  abstract getMessageId(): string;
  abstract getTimestamp(): Date;
  abstract setText(text: string): void;
  abstract getChannelId(): string;
  abstract getAuthorId(): string;
  abstract getChannelTopic(): string | null;
  abstract getUserMentions(): string[];
  abstract getChannelUsers(): string[];
  abstract mentionsUsers(userId: string): boolean;
  abstract isFromBot(): boolean;
  abstract getAuthorName(): string;

  // Optional Methods (CAN override)
  getGuildOrWorkspaceId(): string | null;
  isReplyToBot(): boolean;
  isDirectMessage(): boolean;
}
```

**Implementations**:
- ✅ `DiscordMessage` - [`packages/adapter-discord/src/DiscordMessage.ts`](packages/adapter-discord/src/DiscordMessage.ts)
- ✅ `SlackMessage` - [`packages/adapter-slack/src/SlackMessage.ts`](packages/adapter-slack/src/SlackMessage.ts)
- ✅ `MattermostMessage` - [`packages/adapter-mattermost/src/MattermostMessage.ts`](packages/adapter-mattermost/src/MattermostMessage.ts)

---

### 2. IMessengerService (High-level Service Interface)
**Location**: [`packages/shared-types/src/IMessengerService.ts`](packages/shared-types/src/IMessengerService.ts)

Unified API for messaging operations across platforms.

```typescript
export interface IMessengerService {
  // Core Methods (REQUIRED)
  initialize(): Promise<void>;
  sendMessageToChannel(channelId: string, message: string, senderName?: string, threadId?: string, replyToMessageId?: string): Promise<string>;
  getMessagesFromChannel(channelId: string, limit?: number): Promise<IMessage[]>;
  sendPublicAnnouncement(channelId: string, announcement: any): Promise<void>;
  getClientId(): string;
  getDefaultChannel(): string;
  shutdown(): Promise<void>;
  setMessageHandler(handler: (message: IMessage, historyMessages: IMessage[], botConfig: any) => Promise<string>): void;

  // Optional Methods
  getAgentStartupSummaries?: () => Array<{...}>;
  resolveAgentContext?(params: {...}): null | {...};
  getChannelTopic?(channelId: string): Promise<string | null>;
  supportsChannelPrioritization?: boolean;
  scoreChannel?(channelId: string, metadata?: Record<string, any>): number;
  getForumOwner?(forumId: string): Promise<string>;
  getDelegatedServices?(): Array<{...}>;
  setModelActivity?(modelId: string, senderKey?: string): Promise<void>;
  sendTyping?(channelId: string, senderName?: string, threadId?: string): Promise<void>;
}
```

**Implementations**:
- ✅ `DiscordService` - [`packages/adapter-discord/src/DiscordService.ts`](packages/adapter-discord/src/DiscordService.ts)
- ✅ `SlackService` - [`packages/adapter-slack/src/SlackService.ts`](packages/adapter-slack/src/SlackService.ts)
- ✅ `MattermostService` - [`packages/adapter-mattermost/src/MattermostService.ts`](packages/adapter-mattermost/src/MattermostService.ts)

---

### 3. ILlmProvider (LLM Integration Interface)
**Location**: [`src/llm/interfaces/ILlmProvider.ts`](src/llm/interfaces/ILlmProvider.ts)

Interface for Large Language Model providers.

```typescript
export interface ILlmProvider {
  // Capability Detection
  supportsChatCompletion(): boolean;
  supportsCompletion(): boolean;

  // Generation Methods
  generateChatCompletion(userMessage: IMessage, historyMessages: IMessage[], metadata?: any): Promise<string>;
  generateCompletion(prompt: string): Promise<string>;

  // Validation
  validateCredentials(): Promise<boolean>;
}
```

**Implementations**:
- ✅ `OpenAiProvider` - [`packages/provider-openai/src/openAiProvider.ts`](packages/provider-openai/src/openAiProvider.ts)
- ✅ `FlowiseProvider` - [`packages/provider-flowise/src/flowiseProvider.ts`](packages/provider-flowise/src/flowiseProvider.ts)
- ✅ `OpenWebUIProvider` - [`packages/provider-openwebui/src/openWebUIProvider.ts`](packages/provider-openwebui/src/openWebUIProvider.ts)
- ✅ `OpenSwarmProvider` - [`packages/provider-openswarm/src/OpenSwarmProvider.ts`](packages/provider-openswarm/src/OpenSwarmProvider.ts)

---

### 4. IMessageProvider (Low-level Transport)
**Location**: [`src/message/interfaces/IMessageProvider.ts`](src/message/interfaces/IMessageProvider.ts)

Low-level message transport for platform-specific implementations.

```typescript
export interface IMessageProvider {
  sendMessage(channelId: string, message: string, senderName?: string): Promise<string>;
  getMessages(channelId: string): Promise<IMessage[]>;
  sendMessageToChannel(channelId: string, message: string, activeAgentName?: string): Promise<string>;
  getClientId(): string;
}
```

**Implementations**:
- ✅ `DiscordMessageProvider` - [`packages/adapter-discord/src/providers/DiscordMessageProvider.ts`](packages/adapter-discord/src/providers/DiscordMessageProvider.ts)
- ✅ `SlackMessageProvider` - [`packages/adapter-slack/src/providers/SlackMessageProvider.ts`](packages/adapter-slack/src/providers/SlackMessageProvider.ts)

---

## Platform Adapters

### Discord Adapter
**Package**: `packages/adapter-discord/`

| File | Purpose | Status |
|------|---------|--------|
| [`DiscordService.ts`](packages/adapter-discord/src/DiscordService.ts) | Main service implementing IMessengerService | ✅ Complete |
| [`DiscordMessage.ts`](packages/adapter-discord/src/DiscordMessage.ts) | IMessage implementation | ✅ Complete |
| [`DiscordMessageProvider.ts`](packages/adapter-discord/src/providers/DiscordMessageProvider.ts) | Low-level transport | ✅ Complete |
| [`voiceCommandHandler.ts`](packages/adapter-discord/src/voice/voiceCommandHandler.ts) | Voice command processing | ⚠️ Experimental |
| [`audioRecorder.ts`](packages/adapter-discord/src/voice/audioRecorder.ts) | Audio recording | ⚠️ Experimental |

### Slack Adapter
**Package**: `packages/adapter-slack/`

| File | Purpose | Status |
|------|---------|--------|
| [`SlackService.ts`](packages/adapter-slack/src/SlackService.ts) | Main service implementing IMessengerService | ✅ Complete |
| [`SlackMessage.ts`](packages/adapter-slack/src/SlackMessage.ts) | IMessage implementation | ✅ Complete |
| [`SlackBotManager.ts`](packages/adapter-slack/src/SlackBotManager.ts) | Multi-bot management | ✅ Complete |
| [`SlackWelcomeHandler.ts`](packages/adapter-slack/src/SlackWelcomeHandler.ts) | Welcome message handling | ✅ Complete |

### Mattermost Adapter
**Package**: `packages/adapter-mattermost/`

| File | Purpose | Status |
|------|---------|--------|
| [`MattermostService.ts`](packages/adapter-mattermost/src/MattermostService.ts) | Main service implementing IMessengerService | ✅ Complete |
| [`MattermostMessage.ts`](packages/adapter-mattermost/src/MattermostMessage.ts) | IMessage implementation | ✅ Complete |
| [`mattermostClient.ts`](packages/adapter-mattermost/src/mattermostClient.ts) | API client | ✅ Complete |

---

## LLM Providers

### OpenAI Provider
**Package**: `packages/provider-openai/`

| File | Purpose | Status |
|------|---------|--------|
| [`openAiProvider.ts`](packages/provider-openai/src/openAiProvider.ts) | ILlmProvider implementation | ✅ Complete |
| [`OpenAiService.ts`](packages/provider-openai/src/OpenAiService.ts) | Service wrapper | ✅ Complete |
| [`completion/generateCompletion.ts`](packages/provider-openai/src/completion/generateCompletion.ts) | Completion generation | ✅ Complete |

### Flowise Provider
**Package**: `packages/provider-flowise/`

| File | Purpose | Status |
|------|---------|--------|
| [`flowiseProvider.ts`](packages/provider-flowise/src/flowiseProvider.ts) | ILlmProvider implementation | ✅ Complete |
| [`flowiseRestClient.ts`](packages/provider-flowise/src/flowiseRestClient.ts) | REST API client | ✅ Complete |

### OpenWebUI Provider
**Package**: `packages/provider-openwebui/`

| File | Purpose | Status |
|------|---------|--------|
| [`openWebUIProvider.ts`](packages/provider-openwebui/src/openWebUIProvider.ts) | ILlmProvider implementation | ✅ Complete |
| [`runInference.ts`](packages/provider-openwebui/src/runInference.ts) | Inference execution | ✅ Complete |

---

## Frontend Types

### Bot Management Types
**Location**: [`src/client/src/types/bot.ts`](src/client/src/types/bot.ts)

```typescript
export interface BotConfig {
  name: string;
  messageProvider: string;
  llmProvider: string;
  enabled: boolean;
  // ... additional fields
}
```

### MCP Types
**Location**: [`src/client/src/types/mcp.ts`](src/client/src/types/mcp.ts)

```typescript
export interface MCPServer {
  name: string;
  url: string;
  status: 'connected' | 'disconnected' | 'error';
  tools: MCPTool[];
}
```

### Redux Store Slices
**Location**: [`src/client/src/store/slices/`](src/client/src/store/slices/)

| Slice | Purpose |
|-------|---------|
| [`authSlice.ts`](src/client/src/store/slices/authSlice.ts) | Authentication state |
| [`configSlice.ts`](src/client/src/store/slices/configSlice.ts) | Configuration state |
| [`dashboardSlice.ts`](src/client/src/store/slices/dashboardSlice.ts) | Dashboard metrics |
| [`websocketSlice.ts`](src/client/src/store/slices/websocketSlice.ts) | WebSocket state |

---

## Development Roadmap

### Priority 1: Platform Parity (HIGH)

#### Task 1.1: Slack Context Caching
**Status**: 🔴 Not Started
**Estimated Effort**: Medium (4-8 hours)
**Files to Modify**:
- [`packages/adapter-slack/src/SlackService.ts`](packages/adapter-slack/src/SlackService.ts)
- [`src/message/handlers/messageHandler.ts`](src/message/handlers/messageHandler.ts)

**Description**: Implement context caching for Slack similar to Discord's implementation. This improves response times by caching channel context.

**Acceptance Criteria**:
- [ ] Slack messages use cached context when available
- [ ] Cache invalidation works correctly on new messages
- [ ] Performance tests show improvement

---

#### Task 1.2: Mattermost Wakeword Support
**Status**: 🔴 Not Started
**Estimated Effort**: Small (2-4 hours)
**Files to Modify**:
- [`packages/adapter-mattermost/src/MattermostService.ts`](packages/adapter-mattermost/src/MattermostService.ts)
- [`src/message/handlers/messageHandler.ts`](src/message/handlers/messageHandler.ts)

**Description**: Add wakeword detection support for Mattermost matching Discord/Slack functionality.

**Acceptance Criteria**:
- [ ] Wakewords like `!help`, `!ping` work in Mattermost
- [ ] Custom wakewords configurable per bot
- [ ] Tests pass for wakeword detection

---

#### Task 1.3: Discord Voice Pipeline Completion
**Status**: 🟡 Experimental
**Estimated Effort**: Large (16-24 hours)
**Files to Modify**:
- [`packages/adapter-discord/src/voice/voiceCommandHandler.ts`](packages/adapter-discord/src/voice/voiceCommandHandler.ts)
- [`packages/adapter-discord/src/voice/audioRecorder.ts`](packages/adapter-discord/src/voice/audioRecorder.ts)
- [`packages/adapter-discord/src/voice/speechToText.ts`](packages/adapter-discord/src/voice/speechToText.ts)

**Description**: Complete or remove the experimental Discord voice pipeline. Currently in incomplete state.

**Acceptance Criteria**:
- [ ] Voice commands work end-to-end OR
- [ ] Feature is properly documented as experimental OR
- [ ] Feature is removed if not viable

---

### Priority 2: MCP Integration (MEDIUM)

#### Task 2.1: WebUI Tool Discovery Surfacing
**Status**: 🔴 Not Started
**Estimated Effort**: Medium (4-8 hours)
**Files to Modify**:
- [`src/client/src/components/MCPTools.tsx`](src/client/src/components/MCPTools.tsx) (create if needed)
- [`src/server/routes/mcp.ts`](src/server/routes/mcp.ts)
- [`src/mcp/MCPService.ts`](src/mcp/MCPService.ts)

**Description**: Surface discovered MCP tools in the WebUI for easy management.

**Acceptance Criteria**:
- [ ] Tools listed in WebUI with descriptions
- [ ] Tool parameters displayed
- [ ] Tool execution available from UI (for admins)

---

#### Task 2.2: MCP Usage Limits
**Status**: 🔴 Not Started
**Estimated Effort**: Medium (4-8 hours)
**Files to Modify**:
- [`src/mcp/MCPGuard.ts`](src/mcp/MCPGuard.ts)
- [`src/mcp/MCPService.ts`](src/mcp/MCPService.ts)

**Description**: Implement usage limits for MCP tool execution to prevent abuse.

**Acceptance Criteria**:
- [ ] Rate limiting per user/tool
- [ ] Configurable limits
- [ ] Usage tracking in database

---

#### Task 2.3: MCP Audit Logging
**Status**: 🔴 Not Started
**Estimated Effort**: Small (2-4 hours)
**Files to Modify**:
- [`src/mcp/MCPService.ts`](src/mcp/MCPService.ts)
- [`src/database/DatabaseManager.ts`](src/database/DatabaseManager.ts)

**Description**: Add comprehensive audit logging for MCP tool executions.

**Acceptance Criteria**:
- [ ] All tool executions logged with user, timestamp, parameters
- [ ] Logs queryable via API
- [ ] Logs visible in WebUI

---

### Priority 3: Monitoring & Observability (MEDIUM)

#### Task 3.1: Per-Agent Health Metrics
**Status**: 🔴 Not Started
**Estimated Effort**: Medium (4-8 hours)
**Files to Modify**:
- [`src/server/routes/metrics.ts`](src/server/routes/metrics.ts)
- [`src/client/src/components/Dashboard/AgentHealth.tsx`](src/client/src/components/Dashboard/AgentHealth.tsx)

**Description**: Add per-agent health metrics to monitoring dashboard.

**Acceptance Criteria**:
- [ ] Each bot instance shows health status
- [ ] Historical health data available
- [ ] Alerts for unhealthy agents

---

#### Task 3.2: LLM Latency Metrics
**Status**: 🔴 Not Started
**Estimated Effort**: Small (2-4 hours)
**Files to Modify**:
- [`src/llm/getLlmProvider.ts`](src/llm/getLlmProvider.ts)
- [`src/server/routes/metrics.ts`](src/server/routes/metrics.ts)

**Description**: Track and display LLM response latency metrics.

**Acceptance Criteria**:
- [ ] Latency tracked per provider
- [ ] P50, P95, P99 latencies calculated
- [ ] Metrics visible in dashboard

---

### Priority 4: Testing (MEDIUM)

#### Task 4.1: Mattermost Integration Tests
**Status**: 🔴 Not Started
**Estimated Effort**: Medium (4-8 hours)
**Files to Create**:
- [`tests/integrations/mattermost/MattermostService.test.ts`](tests/integrations/mattermost/MattermostService.test.ts)

**Description**: Add integration tests for Mattermost adapter.

**Acceptance Criteria**:
- [ ] Test coverage > 80%
- [ ] Mock factory pattern used (see [`tests/mocks/discordMockFactory.ts`](tests/mocks/discordMockFactory.ts))
- [ ] All tests pass

---

#### Task 4.2: MCP Integration Tests
**Status**: 🔴 Not Started
**Estimated Effort**: Medium (4-8 hours)
**Files to Create**:
- [`tests/integrations/mcp/MCPService.test.ts`](tests/integrations/mcp/MCPService.test.ts)

**Description**: Add integration tests for MCP service.

**Acceptance Criteria**:
- [ ] Tool discovery tested
- [ ] Tool execution tested
- [ ] Guard logic tested

---

### Priority 5: Developer Experience (LOW)

#### Task 5.1: Onboarding Wizard
**Status**: 🔴 Not Started
**Estimated Effort**: Large (16-24 hours)
**Files to Modify**:
- [`src/client/src/components/Onboarding/OnboardingWizard.tsx`](src/client/src/components/Onboarding/OnboardingWizard.tsx) (create)
- [`src/server/routes/config.ts`](src/server/routes/config.ts)

**Description**: Build guided onboarding wizard that validates tokens, MCP connectivity, and persona assignment before launch.

**Acceptance Criteria**:
- [ ] Step-by-step setup flow
- [ ] Token validation
- [ ] MCP connectivity check
- [ ] Persona assignment

---

#### Task 5.2: API Documentation Generation
**Status**: 🔴 Not Started
**Estimated Effort**: Small (2-4 hours)
**Files to Create**:
- [`docs/api/README.md`](docs/api/README.md)

**Description**: Generate OpenAPI/Swagger documentation for all API endpoints.

**Acceptance Criteria**:
- [ ] All endpoints documented
- [ ] Request/response schemas defined
- [ ] Interactive Swagger UI available

---

## Task Templates for Agents

### Template A: New Interface Implementation

```markdown
## Task: Implement {InterfaceName}

### Context
- Interface definition: `{path-to-interface}`
- Similar implementations: {list-existing-implementations}

### Requirements
1. Implement all required methods from interface
2. Add JSDoc comments for all public methods
3. Create unit tests with >80% coverage
4. Update relevant documentation

### Files to Create/Modify
- `{expected-file-path}` (create)
- `{test-file-path}` (create)
- `docs/reference/developer-interfaces.md` (update)

### Acceptance Criteria
- [ ] All interface methods implemented
- [ ] TypeScript compilation passes
- [ ] All tests pass
- [ ] Documentation updated
```

### Template B: Bug Fix

```markdown
## Task: Fix {BugDescription}

### Context
- Issue: {issue-description}
- Affected files: {list-files}
- Error message: {error-if-any}

### Root Cause Analysis
{analysis-of-root-cause}

### Fix Approach
1. {step-1}
2. {step-2}

### Acceptance Criteria
- [ ] Bug no longer reproduces
- [ ] Regression tests added
- [ ] No new TypeScript errors
```

### Template C: Feature Addition

```markdown
## Task: Add {FeatureName}

### Context
- Related interface: {interface-name}
- Similar features: {existing-similar-features}

### Implementation Plan
1. Create/modify interface if needed
2. Implement core logic
3. Add configuration support
4. Create tests
5. Update documentation

### Files to Create/Modify
- {list-files}

### Acceptance Criteria
- [ ] Feature works as specified
- [ ] Tests pass
- [ ] Documentation updated
- [ ] No TypeScript errors
```

---

## Quick Reference: File Locations

| Category | Location |
|----------|----------|
| Core Interfaces | `packages/shared-types/src/` |
| Discord Adapter | `packages/adapter-discord/src/` |
| Slack Adapter | `packages/adapter-slack/src/` |
| Mattermost Adapter | `packages/adapter-mattermost/src/` |
| OpenAI Provider | `packages/provider-openai/src/` |
| Flowise Provider | `packages/provider-flowise/src/` |
| OpenWebUI Provider | `packages/provider-openwebui/src/` |
| MCP Service | `src/mcp/` |
| Message Handlers | `src/message/handlers/` |
| Server Routes | `src/server/routes/` |
| Frontend Components | `src/client/src/components/` |
| Redux Store | `src/client/src/store/slices/` |
| Test Mocks | `tests/mocks/` |
| Integration Tests | `tests/integrations/` |

---

## Contributing

When picking up a task from this roadmap:

1. **Claim the task** by updating the status to 🟡 In Progress
2. **Create a feature branch** named `feature/{task-id}-{short-description}`
3. **Follow the task template** for consistent implementation
4. **Update this document** with any new interfaces or changes
5. **Submit PR** with reference to the task number

---

*This document is auto-maintained. Last sync: 2026-02-22*
