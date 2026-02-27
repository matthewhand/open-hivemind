# Development Guide

## Project Overview and Architecture

Open-Hivemind is an advanced, multi-agent bot ecosystem built with TypeScript. This system is designed with a modular architecture that scales from a single bot instance to a coordinated swarm across multiple messaging platforms such as Discord and Slack. This guide provides an exhaustive reference for developing new features, debugging complex issues, and maintaining a robust, fault-tolerant system.

## Plugin Architecture: Adapters and Providers

Open-Hivemind uses a **plugin-based architecture** where messaging adapters and LLM providers are **dynamically loaded** at runtime, not compiled into core code. This enables:

- **Hot-swappable providers** – Switch LLM backends without code changes
- **Platform extensibility** – Add new messaging platforms without modifying core logic
- **Clean separation** – Core business logic is independent of specific implementations

### Package Structure

```
packages/
├── adapter-discord/      # Discord messaging adapter
├── adapter-slack/        # Slack messaging adapter
├── adapter-mattermost/   # Mattermost messaging adapter
├── provider-openai/      # OpenAI LLM provider
├── provider-flowise/     # Flowise LLM provider
├── provider-openwebui/   # OpenWebUI LLM provider
├── provider-openswarm/   # OpenSwarm LLM provider
└── shared-types/         # Common interfaces (ILlmProvider, IAdapterFactory)
```

### Dynamic Loading Pattern

Adapters and providers are loaded dynamically via `require()` based on configuration:

**LLM Provider Loading** ([`src/llm/getLlmProvider.ts`](src/llm/getLlmProvider.ts:103)):
```typescript
switch (config.type.toLowerCase()) {
  case 'openai':
    const { OpenAiProvider } = require('@hivemind/provider-openai');
    instance = new OpenAiProvider(config.config);
    break;
  case 'flowise':
    instance = new FlowiseProvider(config.config);
    break;
  // ... additional providers
}
```

**Adapter Loading** ([`src/message/management/getMessengerProvider.ts`](src/message/management/getMessengerProvider.ts:91)):
```typescript
const DiscordMgr = require('@hivemind/adapter-discord');
const svc = DiscordMgr?.DiscordService?.getInstance;
```

### Interface Contracts

All plugins implement interfaces defined in [`packages/shared-types/`](packages/shared-types/src/):

- **[`ILlmProvider`](packages/shared-types/src/ILlmProvider.ts)** – LLM providers must implement:
  - `name: string` – Provider identifier
  - `supportsChatCompletion()` – Capability check
  - `generateChatCompletion()` – Main chat completion method
  - `generateCompletion()` – Plain text completion

- **[`IAdapterFactory`](packages/shared-types/src/IAdapterFactory.ts)** – Messaging adapters must implement:
  - `createService(config, dependencies)` – Factory function returning `IMessengerService`
  - `metadata` – Adapter metadata (name, version, platform)

### Configuration-Driven Loading

Providers and adapters are selected via environment variables or config files:

```env
# Select LLM provider(s)
LLM_PROVIDER=openai,flowise

# Select messaging platform(s)
MESSAGE_PROVIDER=discord,slack

# Per-bot overrides
BOTS_SUPPORT_BOT_MESSAGE_PROVIDER=slack
BOTS_SUPPORT_BOT_LLM_PROVIDER=openai
```

The [`ProviderConfigManager`](src/config/ProviderConfigManager.ts) maintains a registry of configured instances, and the core dynamically instantiates only the providers/adapters referenced in configuration.

### Developing New Adapters/Providers

To add a new messaging platform or LLM backend:

1. **Create a new package** under `packages/adapter-<name>` or `packages/provider-<name>`
2. **Implement the interface** – Extend `ILlmProvider` or `IAdapterFactory` from `@hivemind/shared-types`
3. **Export your class** – Ensure it's accessible via `require()`
4. **Add configuration schema** – Update [`BotConfigurationManager`](src/config/BotConfigurationManager.ts) if new config fields are needed
5. **Register in loader** – Add a case to [`getLlmProvider.ts`](src/llm/getLlmProvider.ts) or [`getMessengerProvider.ts`](src/message/management/getMessengerProvider.ts)

See existing packages for implementation patterns:
- **Discord adapter**: [`packages/adapter-discord/src/DiscordService.ts`](packages/adapter-discord/src/DiscordService.ts)
- **OpenAI provider**: [`packages/provider-openai/src/openAiProvider.ts`](packages/provider-openai/src/openAiProvider.ts)

## Core Architecture and Integration Details

### Multi-Agent System and Bot Initialization
- **Token Splitting and Username Assignment:**  
  Tokens are fetched from `DISCORD_BOT_TOKEN` and split by commas to support multi-agent operations. Usernames are assigned from `DISCORD_USERNAME_OVERRIDE` or default to sequential names (Bot1, Bot2, etc.) when insufficient names are provided.
- **Singleton Discord Service:**  
  The `DiscordService` class ensures only one instance manages multiple Discord clients. Each client corresponds to a bot and listens for events using specific `GatewayIntentBits`.

### Advanced Event Handling
- **Event Registration and Guard Mechanism:**  
  A boolean flag (`handlerSet`) prevents multiple registrations of event handlers, particularly for the `messageCreate` event, ensuring that each message is processed only once.
- **Message Abstraction:**  
  Incoming messages are wrapped as `DiscordMessage` objects which can be extended for custom processing and additional logging.

### Logging, Debugging, and Diagnostics
- **Granular Debug Logging:**  
  Utilizing the `debug` library, detailed logs (e.g., `app:discordService`) track client initialization, login, message dispatch, and error events.
- **Robust Error Handling:**  
  Methods like `sendMessageToChannel` and `fetchMessages` use try-catch blocks to gracefully handle errors, logging issues without halting the service.

### Resource Management and Shutdown Procedures
- **Clean Disconnection:**  
  The `shutdown()` method systematically destroys all Discord client instances, ensuring that all resources are freed and no residual processes remain.

### Testing and Continuous Integration
- **Extensive Automated Testing:**  
  The project includes 33 Jest test suites covering multi-bot initialization, message processing, event handling, and shutdown sequences.
- **Test Execution:**  
  Run tests with:
  ```bash
  npm run test
  ```
  Additional tests exist to simulate edge cases and verify recovery from error conditions.

## Engineering Best Practices and Contribution Guidelines

### Code Style and Standards
- **TypeScript Strictness:**  
  Emphasis is on strong type safety and clear modular designs to minimize runtime failures.
- **Modular Development:**  
  New features should be added to the appropriate directories (e.g., `src/integrations/` or `src/llm/`) following the established design patterns.

### Development Workflow
- **Environment Setup:**  
  Use Node.js v18 or later. Ensure environment variables like `DISCORD_BOT_TOKEN` are correctly set in your `.env` files.
- **Debugging:**  
  Enable extended logging via:
  ```bash
  DEBUG=app:* npm start
  ```
- **Iterative Testing:**  
  Utilize comprehensive unit tests and integration tests to validate all changes. Maintain high code coverage and continuously monitor logs for irregularities.

### Future Directions and Community Contributions
- **Platform Expansion:**  
  Plans include integrating additional messaging platforms such as Telegram and WhatsApp.
- **Enhanced Multi-Agent Coordination:**  
  Future enhancements will focus on dynamic agent role specialization and improved inter-agent communication.
- **Community Engagement:**  
  Contributions are welcomed that extend the framework’s capabilities while adhering to strict testing and code quality standards.

---

This document serves as a comprehensive manual for developers working on Open-Hivemind, detailing intricate operational mechanics and best practices to ensure a resilient and scalable bot ecosystem.