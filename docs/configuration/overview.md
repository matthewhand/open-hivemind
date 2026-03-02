# Configuration Management

Navigation: [Docs Index](../README.md) | [Multi-Instance Setup](multi-instance-setup.md) | [Provider Cheatsheet](provider-cheatsheet.md)


Open-Hivemind ships with a layered configuration system that lets you scale
from a single `.env` file to multi-tenant deployments managed entirely through
the WebUI.

## Sources & Precedence
1. **Environment variables** – highest priority. Anything defined in the shell
   or `.env` file wins.
2. **BotConfigurationManager overrides** – values persisted by the WebUI in
   `config/user/bot-overrides.json`.
3. **Static configuration files** – defaults under `config/` (e.g.
   `config/default.json`, `config/bots/*.json`).
4. **Personas and templates** – JSON/YAML content in `config/personas/` that can
   be referenced by name.

Convict provides schema validation and sensible defaults at each layer.

## Essential Environment Variables
```env
# Global identity
MESSAGE_USERNAME_OVERRIDE=OpenHivemind

# Discord solo mode
DISCORD_BOT_TOKEN=token1

# Discord swarm mode
DISCORD_BOT_TOKEN=token1,token2,token3

# Multi-agent registry (mixed platforms)
BOTS=discord-alpha,slack-support
BOTS_DISCORD_ALPHA_MESSAGE_PROVIDER=discord
BOTS_DISCORD_ALPHA_DISCORD_BOT_TOKEN=token1
BOTS_SLACK_SUPPORT_MESSAGE_PROVIDER=slack
BOTS_SLACK_SUPPORT_SLACK_BOT_TOKEN=xoxb-...

# LLM providers
LLM_PROVIDER=openai,flowise
OPENAI_API_KEY=sk-...
FLOWISE_BASE_URL=http://localhost:3000

# MCP servers (example)
MCP_SERVERS=internal-tools
MCP_INTERNAL_TOOLS_URL=https://mcp.example.com
MCP_INTERNAL_TOOLS_API_KEY=...

# Tool guard defaults
MCP_TOOL_GUARD_MODE=owner
MCP_TOOL_GUARD_ALLOWLIST=1234567890,9876543210
```

## Personas & System Instructions
- Personas are stored in `config/personas/`. Each file exposes a `key`,
  `displayName`, and prompt content.
- Assign a persona globally with `MESSAGE_PERSONA_KEY=<key>` or per agent via
  `BOTS_{NAME}_PERSONA_KEY`.
- Provide ad-hoc system instructions using `MESSAGE_SYSTEM_INSTRUCTIONS` or
  `BOTS_{NAME}_SYSTEM_INSTRUCTIONS`.
- When both are supplied, the persona template loads first and system
  instructions append additional guidance.

## WebUI Overrides & Guardrails
- The WebUI shows which fields are locked by environment variables. Locked
  values appear redacted but give prefix/suffix hints.
- Editable fields persist to `config/user/bot-overrides.json` and automatically
  merge on restart.
- Overrides track provenance so that future environment changes can supersede
  outdated UI edits.

## Tool Usage Guards
- Configure guard defaults globally with `MCP_TOOL_GUARD_MODE` (`off`, `owner`,
  `allowlist`).
- Supply allowlists via comma-separated user IDs in
  `MCP_TOOL_GUARD_ALLOWLIST`.
- Fine-tune per agent with `BOTS_{NAME}_MCP_GUARD_MODE` or per tool by editing
  `config/mcp/tool-guards.json`.

## Debugging Configuration
```bash
# Inspect resolved configuration for a bot
node -e "
const manager = require('./dist/config/BotConfigurationManager').default.getInstance();
console.log(manager.getAllBots());
"

# Show warnings emitted during resolution
DEBUG=app:BotConfigurationManager npm start
```

For deeper dives into multi-instance orchestration, read
[`multi-instance-setup.md`](multi-instance-setup.md) and the
[`PACKAGE.md`](../../PACKAGE.md) capability matrix.
