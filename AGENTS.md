# Copilot Instructions for Open-Hivemind

## Architecture Overview

**Open-Hivemind** is a **multi-agent orchestration framework** combining Discord/Slack/Mattermost bots with a unified LLM provider system, shared context management, and a React-based WebUI—all served from a single port (default `3028`). Key components:

- **Message Router**: Routes messages from Discord, Slack, or Mattermost to the LLM provider
- **BotConfigurationManager**: Multi-instance bot setup via `BOTS_{name}_*` env vars or `config/` files
- **MCPService**: Connects to Model Context Protocol servers for tool discovery and execution
- **ConfigurationManager**: Centralizes config with convict-based schema validation and env var precedence
- **Unified Server**: Single Express process serving both bots and WebUI at same port

## Quick Startup

```bash
make start-dev          # TypeScript dev with nodemon (recommended)
npm run test            # Unit + integration tests
npm run test:real       # Real Discord API tests (requires credentials)
npm run build && npm run start  # Production build & run
```

**Port Setup**: Default port is `3028`. Unified server serves API + WebUI from same origin—no CORS headaches.

## Code Patterns & Key Files

### 1. Multi-Bot Configuration
**File**: `src/config/BotConfigurationManager.ts` (1000+ lines)

- Parse `BOTS=bot1,bot2,bot3` or legacy `DISCORD_BOT_TOKEN=t1,t2,t3`
- Per-bot env vars: `BOTS_bot1_MESSAGE_PROVIDER=discord`, `BOTS_bot1_LLM_PROVIDER=openai`
- `BotConfigurationManager.getBotConfig(botName)` returns validated convict config schema
- Fallback to `config/bots/{botName}.json` if env not set
- **When adding a new bot config field**: Add to `botSchema` in `BotConfigurationManager.ts`, then reference via `config.get('FIELD_NAME')`

**Example Pattern** (from tests):
```typescript
const manager = new BotConfigurationManager();
const botConfig = manager.getBotConfig('bot1');
console.log(botConfig.get('MESSAGE_PROVIDER')); // 'discord'
```

### 2. Configuration & Env Precedence
**Files**: `src/config/ConfigurationManager.ts`, `src/config/*.ts` providers

**Precedence** (highest to lowest):
1. **Test config** (`NODE_CONFIG_DIR=config/test/`)
2. **Environment variables** (`.env`)
3. **Provider files** (`config/providers/*.json`)
4. **Defaults** (`config/default.json`)

**When adding a new config field**:
- Add to appropriate provider file: `discordConfig.ts`, `openaiConfig.ts`, etc.
- Use `config.get('KEY')` via ConfigurationManager singleton
- Always provide a `default` + `env` mapping in convict schema

### 3. Message Flow & Integrations
**Files**: `packages/adapter-discord/`, `packages/adapter-slack/`, `packages/adapter-mattermost/`, `src/message/handlers/`

**Pattern**: `IMessengerService` interface implemented by `DiscordService`, `SlackService`, `MattermostService`
- `onMessage(IMessage)` → `messageHandler.ts` processes → routes to `getLlmProvider()` → response sent back

**Critical file**: `src/message/handlers/messageHandler.ts`—the main orchestrator
- Detects mentions/wakewords (`!help`, `!ping`)
- Manages rate limiting and context history
- Guards against bot-to-bot loops

### 4. LLM Provider Integration
**Files**: `src/llm/interfaces/ILlmProvider.ts`, `src/integrations/{openai,flowise,openwebui}/`

**Interface Pattern**:
```typescript
export interface ILlmProvider {
  name: string;
  supportsChatCompletion: () => boolean;
  supportsCompletion: () => boolean;
  generateChatCompletion: (
    userMessage: string,
    historyMessages: IMessage[],
    metadata?: Record<string, any>
  ) => Promise<string>;
  generateStreamingChatCompletion?: (
    userMessage: string,
    historyMessages: IMessage[],
    onChunk: (chunk: string) => void,
    metadata?: Record<string, any>
  ) => Promise<string>;
  generateCompletion: (prompt: string) => Promise<string>;
  validateCredentials(): Promise<boolean>;
  generateResponse(message: IMessage, context?: IMessage[]): Promise<string>;
}
```

**Supported Providers**: OpenAI, Flowise, OpenWebUI, OpenSwarm, Perplexity, Replicate, N8N

**When adding a new LLM provider**:
1. Create `src/integrations/{provider}/` directory
2. Implement `ILlmProvider` interface
3. Register in `src/llm/getLlmProvider.ts` switch statement
4. Add config class in `src/config/{provider}Config.ts`
5. Update `BotConfigurationManager.botSchema` `LLM_PROVIDER` format array

### 5. Model Context Protocol (MCP)
**Files**: `src/mcp/MCPService.ts`, `src/mcp/MCPGuard.ts`

**Flow**:
- `MCPService.connectToServer(config)` → discover tools
- `MCPGuard` validates access (owner-only or custom user allowlist)
- Tools stored in `Map<serverName, MCPTool[]>`
- WebUI at `/api/webui/mcp-servers` manages connections + tool guards

**When integrating MCP tools into LLM response**:
- Call `MCPService.getInstance().tools.get(serverName)` to find available tools
- Pass tool descriptions to LLM system prompt
- Execute tools via `MCPService` after LLM selects one

### 6. WebUI & Frontend
**Files**: `src/client/` (React + Vite), `src/server/routes/`, `src/server/services/WebSocketService.ts`

**Build**: `npm run build:frontend` → outputs to `src/client/dist/`
**Dev HMR**: `SKIP_MESSENGERS=true npm run dev` runs WebUI-only without bot services
**Routes**:
- `/` → WebUI (React single-page app)
- `/api/*` → RESTful backend API
- `/webui/socket.io` → WebSocket for real-time updates

**Frontend Redux store**: Located in `src/client/src/store/` for state management across components

### 7. Testing Strategy
**Files**: `jest.config.js` (three test projects), `tests/` directory

**Projects**:
- **unit-integration** (`tests/**/*.test.ts`): Mocked services, runs in Node
- **real-integration** (`tests/**/*.real.test.ts`): Live API calls (Discord, Slack)
- **frontend** (`src/client/**/*.test.ts`): jsdom environment

**Run tests**:
```bash
npm run test                # Unit + integration (mocked)
npm run test:coverage       # With coverage report
npm run test:debug          # Verbose debug output
npm run test:real           # Live API tests
```

**Mock pattern** (from jest.config.js):
- `tests/mocks/` contains mock implementations (Discord, Slack, SQLite, bcrypt)
- `tests/__mocks__/` contains Jest module mocks
- Avoid real network calls in unit tests

### 8. Database & Storage
**Files**: `src/database/DatabaseManager.ts`, `src/storage/`, `src/config/UserConfigStore.ts`

- **UserConfigStore**: Persists bot overrides to `config/user/bot-overrides.json`
- **DatabaseManager**: Manages SQLite connections (test uses in-memory DB)
- **When adding persistent data**: Use UserConfigStore for simple overrides, DatabaseManager for complex queries

### 9. Persona & System Instructions
**Files**: `src/server/routes/personas.ts`, `config/personas/`

- Personas stored as JSON files in `config/personas/{name}.json`
- Each persona has: `name`, `description`, `systemInstruction`, `metadata`
- WebUI CRUD at `/api/admin/personas`
- **When assigning persona to bot**: Set `PERSONA` in BotConfigurationManager or via WebUI override

### 10. Critical Build & Environment Patterns

**TypeScript Compilation**:
- Development: `ts-node -r tsconfig-paths/register src/index.ts` (live reload via nodemon)
- Production: `npm run build` compiles `src/` → `dist/`, copies `config/` and scripts
- **Path aliases** in `tsconfig.json`: `@src`, `@config`, `@integrations`, etc.

**Environment Variables**:
- `.env` file loaded via `dotenv` at startup
- Critical vars: `DISCORD_BOT_TOKEN`, `OPENAI_API_KEY`, `MESSAGE_PROVIDER`, `LLM_PROVIDER`
- Test isolation: `NODE_CONFIG_DIR=config/test/` overrides all config

**Module Resolution**:
- **Production/Test**: Uses `module-alias/register` mapping `_moduleAliases` in `package.json`
- **Development**: Uses `tsconfig.json` "paths" via `tsconfig-paths/register`
- **Never hardcode relative paths**—use `@` aliases consistently

## Common Development Tasks

### Add a New Discord Command
1. Create handler in `src/message/handlers/commands/`
2. Register in `messageHandler.ts` via wakeword detection
3. Write tests in `tests/integrations/discord/` matching `.test.ts` pattern
4. Run `npm run test` to validate

### Add a New LLM Provider
1. Create `src/integrations/{provider}/{provider}Provider.ts` implementing `ILlmProvider`
2. Create config in `src/config/{provider}Config.ts`
3. Register in `src/llm/getLlmProvider.ts` switch
4. Update `BotConfigurationManager` `LLM_PROVIDER` enum
5. Add test in `tests/llm/`

### Connect a New MCP Server
1. In WebUI, navigate to **MCP Servers** tab
2. Enter server URL + API key
3. Click **Connect**—tools auto-discovered
4. Set tool guards (owner-only or user allowlist)
5. Bots can now use those tools in responses

### Debug Configuration Issues
```bash
NODE_ENV=development DEBUG=app:* npm run start:dev
```
- Logs prefixed with `app:ConfigurationManager`, `app:BotConfigurationManager`, etc.
- Check `config/test/default.json` for test config baseline
- Verify precedence: env vars override files

### Test a Single Module
```bash
npm run test -- --testPathPattern="ConfigurationManager"
```

## Antipatterns to Avoid

1. **Hardcoded relative imports**: Use `@src/`, `@config/`, `@integrations/` aliases—don't use `../../../`
2. **Skipping config validation**: Always use ConfigurationManager + convict schema; don't read `process.env` directly
3. **Creating service instances**: Use singleton pattern (`getInstance()`) for `MCPService`, `ConfigurationManager`, `BotManager`
4. **Mixing test/prod configs**: Respect `NODE_CONFIG_DIR=config/test/` in tests; never commit test data to production config
5. **Ignoring message abstraction**: Always use `IMessage` interface, not platform-specific objects
6. **Unguarded tool execution**: Always check `MCPGuard` before executing MCP tools
7. **Missing error handling**: Wrap integrations in try-catch; log via Logger singleton, not `console.log`

## Key Files Reference

| Path | Purpose |
|------|---------|
| `src/index.ts` | Main server entry point; initializes bots, HTTP, WebSocket |
| `src/config/BotConfigurationManager.ts` | Multi-bot configuration parsing & validation |
| `src/config/ConfigurationManager.ts` | Global config singleton + env var precedence |
| `src/message/handlers/messageHandler.ts` | Core message orchestration (detect mention → route → respond) |
| `packages/adapter-{discord,slack,mattermost}/` | Platform adapters implementing `IMessengerService` |
| `src/llm/getLlmProvider.ts` | LLM provider factory |
| `src/mcp/MCPService.ts` | MCP server connections & tool discovery |
| `src/server/routes/config.ts` | WebUI configuration API endpoints |
| `src/client/` | React + Vite frontend |
| `jest.config.js` | Jest configuration (three test projects) |
| `Makefile` | Recommended startup commands |

## Debugging Checklist

- ✅ Check `.env` exists and has required tokens
- ✅ Run `npm run test -- --testPathPattern="Config"` to validate configuration
- ✅ Enable debug logs: `DEBUG=app:* npm run start:dev`
- ✅ Verify module aliases work: `node -r tsconfig-paths/register -e "require('@src/index.ts')"`
- ✅ Inspect `config/user/bot-overrides.json` for unexpected overrides
- ✅ Check test isolation: `NODE_CONFIG_DIR=config/test/` for test runs only
- ✅ For MCP issues, verify server URL + API key in WebUI before attempting tool calls