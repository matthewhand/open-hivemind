# Adapter Package Development Checklist

This checklist documents the steps required to create or migrate an adapter package in the Open-Hivemind monorepo. Follow these steps to ensure consistency with existing adapters (Discord, Slack, Mattermost).

## 1. Package Structure

Create the adapter package directory:

```
packages/adapter-{name}/
├── src/
│   ├── index.ts                    # Public exports
│   ├── {Name}Service.ts            # Main service implementing IMessengerService
│   ├── {Name}Message.ts            # Message class extending IMessage
│   ├── {Name}ConnectionTest.ts     # Connection testing utility
│   └── ... (additional modules)
├── package.json
└── tsconfig.json
```

## 2. Module Alias Configuration

### tsconfig.json

Create `packages/adapter-{name}/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist",
    "declaration": true,
    "declarationMap": true,
    "composite": true,
    "baseUrl": ".",
    "paths": {
      "@hivemind/shared-types": ["../shared-types/src"],
      "@src/*": ["../../src/*"],
      "@config/*": ["../../src/config/*"],
      "@message/*": ["../../src/message/*"],
      "@types/*": ["../../src/types/*"],
      "@server/*": ["../../src/server/*"],
      "@services/*": ["../../src/services/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"],
  "references": [
    { "path": "../shared-types" }
  ]
}
```

### jest.config.js moduleNameMapper

Add entries to `jest.config.js` in **all three projects** (unit-integration, real-integration, frontend):

```javascript
// In moduleNameMapper object for each project:
'^@hivemind/adapter-{name}$': '<rootDir>/packages/adapter-{name}/src/index.ts',
'^@hivemind/adapter-{name}/(.*)$': '<rootDir>/packages/adapter-{name}/src/$1',
'^@integrations/{name}/(.*)$': '<rootDir>/packages/adapter-{name}/src/$1',
```

## 3. package.json

Create `packages/adapter-{name}/package.json`:

```json
{
  "name": "@hivemind/adapter-{name}",
  "version": "1.0.0",
  "description": "{Name} adapter for Open Hivemind",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "npx tsc",
    "clean": "rm -rf dist",
    "test": "echo \"No tests yet\" && exit 0"
  },
  "dependencies": {
    "debug": "^4.3.7"
  },
  "peerDependencies": {
    "@hivemind/shared-types": "*"
  },
  "devDependencies": {
    "@types/debug": "^4.1.12",
    "typescript": "^5.9.2"
  },
  "files": ["dist", "src"]
}
```

## 4. IMessengerService Implementation

Implement the `IMessengerService` interface in `{Name}Service.ts`:

```typescript
import { EventEmitter } from 'events';
import type { IMessage } from '@message/interfaces/IMessage';
import type { IMessengerService } from '@message/interfaces/IMessengerService';

export class {Name}Service extends EventEmitter implements IMessengerService {
  private static instance: {Name}Service | undefined;

  public supportsChannelPrioritization: boolean = true;

  private constructor() {
    super();
    // Initialize configuration from BotConfigurationManager
  }

  public static getInstance(): {Name}Service {
    if (!{Name}Service.instance) {
      {Name}Service.instance = new {Name}Service();
    }
    return {Name}Service.instance;
  }

  // Required methods:
  async initialize(): Promise<void> { /* ... */ }
  async sendMessageToChannel(channelId: string, message: string, senderName?: string, threadId?: string, replyToMessageId?: string): Promise<string> { /* ... */ }
  async getMessagesFromChannel(channelId: string, limit?: number): Promise<IMessage[]> { /* ... */ }
  async sendPublicAnnouncement(channelId: string, announcement: any): Promise<void> { /* ... */ }
  getClientId(): string { /* ... */ }
  getDefaultChannel(): string { /* ... */ }
  async shutdown(): Promise<void> { /* ... */ }
  setMessageHandler(handler: (message: IMessage, historyMessages: IMessage[], botConfig: any) => Promise<string>): void { /* ... */ }

  // Optional but recommended:
  async getChannelTopic?(channelId: string): Promise<string | null>;
  getAgentStartupSummaries?(): Array<{ name: string; provider: string; ... }>;
  resolveAgentContext?(params: { botConfig: any; agentDisplayName: string }): null | { botId?: string; senderKey?: string; nameCandidates?: string[]; };
  async setModelActivity?(modelId: string, senderKey?: string): Promise<void>;
  async sendTyping?(channelId: string, senderName?: string, threadId?: string): Promise<void>;
  scoreChannel?(channelId: string, metadata?: Record<string, any>): number;
  getDelegatedServices?(): Array<{ serviceName: string; messengerService: IMessengerService; botConfig: any; }>;
  getForumOwner?(forumId: string): Promise<string>;
}

export default {Name}Service;
```

## 5. IMessage Implementation

Create `{Name}Message.ts` extending the abstract `IMessage` class:

```typescript
import type { IMessage } from '@message/interfaces/IMessage';

export default class {Name}Message extends IMessage {
  constructor(data: any, repliedMessage?: any) {
    super(data, 'user');
    this.platform = '{name}';
    this.content = this.extractContent(data);
    this.channelId = this.extractChannelId(data);
  }

  getMessageId(): string { /* ... */ }
  getTimestamp(): Date { /* ... */ }
  setText(text: string): void { /* ... */ }
  getChannelId(): string { /* ... */ }
  getAuthorId(): string { /* ... */ }
  getChannelTopic(): string | null { /* ... */ }
  getUserMentions(): string[] { /* ... */ }
  getChannelUsers(): string[] { /* ... */ }
  mentionsUsers(userId: string): boolean { /* ... */ }
  isFromBot(): boolean { /* ... */ }
  getAuthorName(): string { /* ... */ }
  isDirectMessage(): boolean { /* ... */ }
  getGuildOrWorkspaceId(): string | null { /* ... */ }

  private extractContent(data: any): string { /* ... */ }
  private extractChannelId(data: any): string { /* ... */ }
}
```

## 6. index.ts Exports Structure

Create `packages/adapter-{name}/src/index.ts`:

```typescript
// Main service export
export { default as {Name}Service } from './{Name}Service';
export { default as {Name}Message } from './{Name}Message';

// Connection test utility
export { test{Name}Connection, type {Name}ConnectionTestResult } from './{Name}ConnectionTest';

// Additional public modules (if any)
// export { SomeHelper } from './utils/SomeHelper';
```

## 7. Re-export Pattern for src/integrations/{name}/

Create or update `src/integrations/{name}/index.ts` to re-export from the adapter package:

```typescript
export { default as {Name}Service } from '@hivemind/adapter-{name}';
export { default as {Name}Message } from '@hivemind/adapter-{name}';
export { test{Name}Connection } from '@hivemind/adapter-{name}';
```

This maintains backward compatibility for existing imports like:
```typescript
import {Name}Service from '@integrations/{name}';
```

## 8. ConnectionTest Utility Pattern

Create `{Name}ConnectionTest.ts` following this pattern:

```typescript
export interface {Name}ConnectionTestResult {
  ok: boolean;
  message: string;
  details?: Record<string, unknown>;
}

export const test{Name}Connection = async (
  credentials: { /* platform-specific credentials */ }
): Promise<{Name}ConnectionTestResult> => {
  try {
    // Validate credentials
    if (!credentials.token) {
      return { ok: false, message: '{Name} credentials are required' };
    }

    // Test connection using platform API
    const response = await fetch('https://api.{platform}.com/v1/test', {
      headers: { Authorization: `Bearer ${credentials.token}` },
    });

    if (!response.ok) {
      return {
        ok: false,
        message: `{Name} API error: ${response.status}`,
        details: { status: response.status },
      };
    }

    const data = await response.json();
    return {
      ok: true,
      message: `Connected as ${data.username || data.id}`,
      details: data,
    };
  } catch (error: unknown) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Connection failed',
    };
  }
};
```

## 9. Testing Requirements

### Test File Locations

Place tests in appropriate directories under `tests/`:

```
tests/
├── integrations/{name}/
│   ├── {Name}Service.test.ts           # Unit tests with mocks
│   ├── {Name}Service.integration.test.ts # Integration tests
│   ├── {Name}Message.test.ts           # Message class tests
│   └── {Name}Service.real.test.ts      # Live API tests (RUN_REAL_TESTS=true)
└── mocks/
    └── {name}Mock.ts                   # Mock implementations
```

### Test Patterns

```typescript
// Unit test example (tests/integrations/{name}/{Name}Service.test.ts)
import { {Name}Service } from '@hivemind/adapter-{name}';

describe('{Name}Service', () => {
  beforeEach(() => {
    // Reset singleton if needed
    ({Name}Service as any).instance = undefined;
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = {Name}Service.getInstance();
      const instance2 = {Name}Service.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('initialize', () => {
    it('should throw if no bots configured', async () => {
      const service = {Name}Service.getInstance();
      await expect(service.initialize()).rejects.toThrow();
    });
  });
});
```

### Mock Pattern

Create `tests/__mocks__/{name}.ts` or `tests/mocks/{name}Mock.ts`:

```typescript
export const mock{Name}Client = {
  on: jest.fn(),
  emit: jest.fn(),
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
};

jest.mock('@{name}/sdk', () => ({
  Client: jest.fn(() => mock{Name}Client),
}));
```

### Running Tests

```bash
npm run test -- --testPathPattern="{Name}"           # Unit + integration
npm run test:coverage -- --testPathPattern="{Name}"  # With coverage
RUN_REAL_TESTS=true npm run test:real                # Live API tests
```

## 10. Configuration Integration

### BotConfigurationManager

Add the new adapter to `src/config/BotConfigurationManager.ts`:

1. Add to `MESSAGE_PROVIDER` format array in `botSchema`
2. Add a new method similar to `getDiscordBotConfigs()`:

```typescript
public get{Name}BotConfigs(): any[] {
  const bots = this.getAllBots();
  return bots.filter(bot => bot.messageProvider === '{name}');
}
```

### Provider Config

Create `src/config/{name}Config.ts`:

```typescript
import convict from 'convict';

const {name}Config = convict({
  {NAME}_DEFAULT_CHANNEL_ID: {
    doc: 'Default channel ID for {name} bot',
    default: '',
    env: '{NAME}_DEFAULT_CHANNEL_ID',
    format: String,
  },
  // ... additional config options
});

export default {name}Config;
```

### LLM Provider Factory

If the adapter uses a specific LLM provider, update `src/llm/getLlmProvider.ts` switch statement.

## 11. Common Pitfalls to Avoid

### 1. Circular Dependencies

**Problem:** Importing `{Name}Service` from both `@hivemind/adapter-{name}` and `@integrations/{name}` can cause circular dependencies.

**Solution:** Use the re-export pattern in `src/integrations/{name}/index.ts` and import from only one location:

```typescript
// Good
import {Name}Service from '@hivemind/adapter-{name}';
import {Name}Service from '@integrations/{name}';

// Bad - mixing both in same codebase
```

### 2. Singleton Reset in Tests

**Problem:** Tests share singleton state across test files.

**Solution:** Always reset singleton in `beforeEach` or `afterEach`:

```typescript
beforeEach(() => {
  ({Name}Service as any).instance = undefined;
});
```

### 3. Missing Module Aliases in All Jest Projects

**Problem:** Tests pass in unit-integration but fail in frontend project.

**Solution:** Add `moduleNameMapper` entries to all three projects in `jest.config.js`.

### 4. Hardcoded Relative Paths

**Problem:** Using `../../../` imports breaks when files move.

**Solution:** Always use `@` aliases:

```typescript
// Bad
import { something } from '../../../src/config/something';

// Good
import { something } from '@config/something';
```

### 5. Platform-Specific Types in IMessage

**Problem:** Exposing platform SDK types in `IMessage` breaks abstraction.

**Solution:** Normalize all data to provider-agnostic format:

```typescript
// Bad
getUserMentions(): User[] { return this.data.mentions; }

// Good
getUserMentions(): string[] { return this.data.mentions.map(m => m.id); }
```

### 6. Missing Error Classes

**Problem:** Throwing generic `Error` instead of domain-specific errors.

**Solution:** Import and use error classes:

```typescript
import {
  ConfigurationError,
  NetworkError,
  ValidationError,
} from '@types/errorClasses';

if (!token) {
  throw new ValidationError('Token required', '{NAME}_MISSING_TOKEN');
}
```

### 7. Ignoring Multi-Bot Support

**Problem:** Implementing single-bot only when Discord/Slack support multiple instances.

**Solution:** Design for multi-bot from the start:

```typescript
private bots: Bot[] = [];

public getDelegatedServices(): Array<{ serviceName: string; messengerService: IMessengerService; botConfig: any; }> {
  return this.bots.map(bot => ({
    serviceName: `{name}-${bot.name}`,
    messengerService: this.createServiceWrapper(bot),
    botConfig: bot.config,
  }));
}
```

### 8. Thread/Reply Handling

**Problem:** Not supporting thread replies causes messages to appear in main channel.

**Solution:** Implement `threadId` parameter in `sendMessageToChannel`:

```typescript
async sendMessageToChannel(
  channelId: string,
  message: string,
  senderName?: string,
  threadId?: string,
  replyToMessageId?: string
): Promise<string> {
  // Platform-specific thread handling
}
```

### 9. WebSocket Monitoring Integration

**Problem:** Missing message flow events breaks WebUI monitoring.

**Solution:** Emit WebSocket events:

```typescript
import WebSocketService from '@server/services/WebSocketService';

WebSocketService.getInstance().recordMessageFlow({
  botName,
  provider: '{name}',
  channelId,
  userId,
  messageType: 'incoming' | 'outgoing',
  contentLength: message.length,
  status: 'success',
});
```

### 10. Startup Greeting Service

**Problem:** Service doesn't emit ready event, breaking startup coordination.

**Solution:** Emit service-ready event in `initialize()`:

```typescript
async initialize(): Promise<void> {
  // ... initialization logic

  const startupGreetingService = require('@services/StartupGreetingService').default;
  startupGreetingService.emit('service-ready', this);
}
```

## 12. Verification Checklist

Before submitting, verify:

- [ ] `npm run build` compiles without errors
- [ ] `npm run test -- --testPathPattern="{Name}"` passes
- [ ] Module aliases work in both development and test
- [ ] TypeScript types resolve correctly
- [ ] `IMessengerService` interface fully implemented
- [ ] Singleton pattern correctly implemented
- [ ] Multi-bot support (if applicable)
- [ ] Thread/reply support
- [ ] WebSocket monitoring events emitted
- [ ] Startup greeting service integration
- [ ] Error handling uses domain-specific error classes
- [ ] Configuration integrated with BotConfigurationManager
- [ ] Re-exports from `src/integrations/{name}/` working
