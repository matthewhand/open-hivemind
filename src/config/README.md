# ConfigurationManager - Overview

The `ConfigurationManager` class serves as a centralized manager for environment variables and configuration file values. It dynamically loads specific configurations based on the selected LLM provider, and exposes config helpers for integrations (Discord, Slack, Webhook, etc.).


## Components
- **openaiConfig**: Manages all OpenAI-specific settings.
- **ReplicateConfig**: Manages Replicate API settings.
- **perplexityConfig**: Manages Perplexity AI settings.
- **N8NConfig**: Manages N8N API settings.
- **flowiseConfig**: Manages Flowise API settings.
- **discordConfig**: Handles Discord-related settings.
- **messageConfig**: Messaging-related toggles (e.g., username override).
- Additional provider configs under `src/config/*Config.ts`


## Dynamic Loading

The `ConfigurationManager` dynamically loads the appropriate configuration for the selected LLM provider. This can be done using the `loadLLMConfig` method:

```typescript
import ConfigurationManager from './config/ConfigurationManager';

const configManager = ConfigurationManager.getInstance();
const llmConfig = configManager.loadLLMConfig('openai');
console.log(llmConfig.OPENAI_API_KEY);
```


## Environment vs. File Configuration Precedence

This project uses both environment variables and JSON configuration files (e.g., `config/test/providers/messengers.json`, `config/test.json`). To provide a predictable, testable configuration surface, we apply the following precedence rules:

1) Test-scoped NODE_CONFIG (highest precedence)
   - When running tests, `NODE_CONFIG_DIR=config/test/` and `NODE_ENV=test` are set by the Jest script in `package.json`.
   - Any values present in `config/test/*.json` and `config/test/providers/*.json` apply first for tests.
   - Tip: If you need to point tests at a different fixture set, temporarily change `NODE_CONFIG_DIR` for that test run.

2) Environment variables
   - Environment variables override file-based defaults for the current process.
   - Example: `DISCORD_BOT_TOKEN="token1,token2"` takes precedence over tokens defined in `messengers.json`.
   - Prefer using a .env file for local runs; Node-config and dotenv are loaded before service singletons are created.

3) Providers configuration files
   - Provider-specific files (e.g., `config/providers/*.json`) supply defaults when env is missing.
   - For messaging, `config/providers/messengers.json` (or test-scoped `config/test/providers/messengers.json`) is used.
   - Both legacy and providers-array shapes are supported; see “Messenger Provider Configuration” below.

4) Default config files (lowest precedence)
   - Baseline defaults in `config/default.json` and service-specific defaults are used only when higher layers are absent.

Notes:
- Tests often snapshot/restore `process.env` and `jest.resetModules()` to ensure clean evaluation of precedence per case.
- For singletons, always re-require the module after changing env or config to pick up the new values.
- If a service caches values (e.g., tokens) at construction, ensure you reset the module and re-create the instance between tests.


## Messenger Provider Configuration

Two configuration shapes are supported for messenger providers:

A) Legacy instances arrays
- Example:
```json
{
  "discord": {
    "instances": [
      { "name": "Bot1", "token": "TOKEN_1" },
      { "name": "Bot2", "token": "TOKEN_2" }
    ]
  },
  "slack": {
    "instances": [
      { "name": "Workspace1", "botToken": "xoxb-..." }
    ]
  }
}
```

B) Canonical providers array (recommended)
- Example:
```json
{
  "providers": [
    { "type": "discord", "name": "Bot1", "token": "TOKEN_1" },
    { "type": "discord", "name": "Bot2", "token": "TOKEN_2" },
    { "type": "slack", "name": "Workspace1", "botToken": "xoxb-..." }
  ]
}
```

Normalization
- The system normalizes both shapes into an internal structure.
- When both env and file config provide tokens for Discord:
  - If `DISCORD_BOT_TOKEN` is present, it is parsed as a comma-separated list and used in order.
  - Empty tokens are invalid and should cause validation errors with 1-based positions (e.g., “Empty token at position 2”).
- When env is absent, the system falls back to the file configuration (legacy arrays or providers array).

Migration Guide (legacy -> providers array)
- 1) Identify each legacy section under `messengers.json`:
  - Discord: `discord.instances[]` with fields `{ name, token }`
  - Slack: `slack.instances[]` with fields `{ name, botToken }`
- 2) Create a top-level `providers` array and map each entry:
  - Discord: `{ "type": "discord", "name": "...", "token": "..." }`
  - Slack: `{ "type": "slack", "name": "...", "botToken": "..." }`
- 3) Remove the legacy `discord` and `slack` sections once migrated to avoid ambiguity.
- 4) Tests/fixtures: Prefer providers array in `config/test/providers/messengers.json`. Keep a backup of the original file if tests mutate it.
- 5) Validation: Ensure no empty strings for required fields. For Discord tokens, empty strings should trigger “Empty token at position N in config file”.
- 6) Backwards compatibility: Runtime still accepts legacy shapes, but new features and examples will prioritize the providers array.


## Discord: Effective Token Resolution

Order of resolution during initialization:
1) If `process.env.DISCORD_BOT_TOKEN` exists and is non-empty:
   - Split by comma, trim whitespace from each entry, filter out `null`/`undefined` but NOT empty strings.
   - If any token is an empty string after trimming, throw with a 1-based index: “Empty token at position N”.

2) Else, load from messengers config:
   - Test scope: `config/test/providers/messengers.json`
   - Non-test: `config/providers/messengers.json`
   - Accept either:
     - providers array entries of `{ "type": "discord", "token": "..." }`
     - legacy `discord.instances[]` entries of `{ "token": "..." }`
   - If any required token is an empty string, throw “Empty token at position N in config file”.

3) If neither env nor config provide at least one valid token:
   - Throw “No Discord bot tokens provided in configuration”.

Auxiliary settings:
- `messageConfig.get('MESSAGE_USERNAME_OVERRIDE')` may override the displayed name, used by certain send/log routines.
- `discordConfig.get('DISCORD_DEFAULT_CHANNEL_ID')` and `discordConfig.get('DISCORD_MESSAGE_HISTORY_LIMIT')` are used by channel operations and message fetching.
- The service enforces a hard cap on fetched message history equal to `DISCORD_MESSAGE_HISTORY_LIMIT`.


## Test Guidance for Precedence Scenarios

- Prefer resetting modules between tests:
```ts
jest.resetModules();
const mod = require('@hivemind/adapter-discord/DiscordService');
```

- Prepare environment per test and restore:
```ts
const ORIGINAL_ENV = { ...process.env };
process.env.DISCORD_BOT_TOKEN = 'token1,token2';
// ... run assertions ...
process.env = ORIGINAL_ENV;
```

- When mutating config fixtures (tests only), always back up and restore:
```ts
import * as fs from 'fs';
import * as path from 'path';

const configPath = path.resolve(__dirname, '../../../config/test/providers/messengers.json');
const originalConfig = fs.readFileSync(configPath, 'utf-8');
try {
  fs.writeFileSync(configPath, JSON.stringify({ providers: [] }));
  jest.resetModules();
  const svc = require('@hivemind/adapter-discord/DiscordService');
  // ... assertions ...
} finally {
  fs.writeFileSync(configPath, originalConfig);
}
```

- Validate expected errors thrown when configuration is invalid:
  - “No Discord bot tokens provided in configuration”
  - “Empty token at position N”
  - “Empty token at position N in config file”


## Examples

Env takes precedence over file:
```bash
export DISCORD_BOT_TOKEN="AAA,BBB"
# Even if messengers.json contains other tokens, AAA and BBB will be used.
```

File-only configuration (no env) with providers array:
```json
{
  "providers": [
    { "type": "discord", "name": "Primary", "token": "AAA" },
    { "type": "discord", "name": "Secondary", "token": "BBB" }
  ]
}
```

Legacy file configuration:
```json
{
  "discord": {
    "instances": [
      { "name": "Primary", "token": "AAA" },
      { "name": "Secondary", "token": "BBB" }
    ]
  }
}
```

Slack providers example:
```json
{
  "providers": [
    { "type": "slack", "name": "Workspace1", "botToken": "xoxb-..." }
  ]
}
```

## End-to-End Setup Recipes

The following recipes provide concrete steps for common setups. In all examples, environment variables take precedence over file configuration. For local development, prefer a `.env` file.

### .env Samples

Single-bot Discord:
```env
# Discord single bot
DISCORD_BOT_TOKEN=AAA
DISCORD_DEFAULT_CHANNEL_ID=123456789012345678
DISCORD_MESSAGE_HISTORY_LIMIT=10
# Optional username override used by some message flows
MESSAGE_USERNAME_OVERRIDE=Madgwick AI
```

Multi-bot Discord:
```env
# Discord multi-bot (comma-separated)
DISCORD_BOT_TOKEN=AAA,BBB,CCC
DISCORD_DEFAULT_CHANNEL_ID=123456789012345678
DISCORD_MESSAGE_HISTORY_LIMIT=25
```

Slack single workspace:
```env
# Slack single workspace
SLACK_BOT_TOKEN=xoxb-111-222-abc
SLACK_APP_TOKEN=xapp-1-xyz
SLACK_DEFAULT_CHANNEL_ID=C12345678
```

Combined (Discord + Slack):
```env
DISCORD_BOT_TOKEN=AAA,BBB
SLACK_BOT_TOKEN=xoxb-111-222-abc
SLACK_APP_TOKEN=xapp-1-xyz
DISCORD_DEFAULT_CHANNEL_ID=123456789012345678
SLACK_DEFAULT_CHANNEL_ID=C12345678
DISCORD_MESSAGE_HISTORY_LIMIT=15
```

### Providers Array Examples

File: `config/providers/messengers.json` (runtime) or `config/test/providers/messengers.json` (tests)

Single Discord + single Slack:
```json
{
  "providers": [
    { "type": "discord", "name": "Primary", "token": "AAA" },
    { "type": "slack", "name": "Workspace1", "botToken": "xoxb-111-222-abc" }
  ]
}
```

Multi-bot Discord:
```json
{
  "providers": [
    { "type": "discord", "name": "Bot1", "token": "AAA" },
    { "type": "discord", "name": "Bot2", "token": "BBB" },
    { "type": "discord", "name": "Bot3", "token": "CCC" }
  ]
}
```

### Legacy Instances Examples

```json
{
  "discord": {
    "instances": [
      { "name": "Bot1", "token": "AAA" },
      { "name": "Bot2", "token": "BBB" }
    ]
  },
  "slack": {
    "instances": [
      { "name": "Workspace1", "botToken": "xoxb-111-222-abc" }
    ]
  }
}
```

### Quick Start Tasks

1) Single Discord bot (env-first)
- Create `.env` with DISCORD_BOT_TOKEN=AAA and DISCORD_DEFAULT_CHANNEL_ID set.
- Start your app; the Discord service will initialize one client.
- Use send methods to post to DISCORD_DEFAULT_CHANNEL_ID.
- For tests, keep `NODE_CONFIG_DIR=config/test/` as configured; tokens can be injected per test as needed.

2) Multi-Discord bots (env)
- Set `DISCORD_BOT_TOKEN=AAA,BBB`.
- The service will spin up two clients named Bot1 and Bot2 in test mode, or use names from `BotConfigurationManager` when enabled.
- Route sends by passing `senderName` equal to the bot’s name (e.g., "Bot2").

3) Slack single workspace (env or file)
- Provide `SLACK_BOT_TOKEN` and `SLACK_APP_TOKEN` via `.env`.
- Or add to providers array as shown above.
- Initialize Slack service; post to `SLACK_DEFAULT_CHANNEL_ID`.

### Troubleshooting

- I changed env but tests still use old values.
  - Ensure tests call `jest.resetModules()` and re-require services to drop singleton and cached config.
  - Snapshot/restore `process.env` in each test to avoid cross-test leakage.

- Discord message history limit not applied.
  - Confirm `DISCORD_MESSAGE_HISTORY_LIMIT` is set. The service enforces a hard cap at fetch time and again when wrapping history.

- Empty Discord token error during tests.
  - If using `DISCORD_BOT_TOKEN` with commas, ensure no trailing comma or empty segment. Errors include a 1-based index to the offending token.

- Channel not text-based or not found.
  - Validate target IDs and ensure your bot has permissions. For threads, verify the thread ID exists and is a thread.

- Using legacy config but want providers array.
  - Follow the Migration Guide above. Runtime supports both, but examples and new features prefer the providers array.

- Slack permissions errors on send.
  - Ensure scopes and channel access are correct. In tests, mock send to simulate Missing Permissions and assert empty result handling.

### Verification Steps

- Unit/Integration tests
  - Discord: token validation, multi-bot init, handler registration, send routing, announcements, fetch limits, error paths.
  - Slack: event listener and basic send/fetch flows, with mocked clients in tests to avoid network dependencies.

- Manual sanity checks
  - Start the app with `.env` set and verify logs show bots logging in and default channels resolved.
  - Trigger a message event in a test server and observe handler behavior and history retrieval.
