# Platform Integrations

Navigation: [Docs Index](../README.md) | [Architecture Overview](../architecture/layered-overview.md) | [Configuration Overview](../configuration/overview.md)


Open-Hivemind maintains a unified voice across every messenger by abstracting
platform-specific quirks behind shared services. This guide summarises what is
available today and how each integration behaves.

## Discord
- **Solo & swarm modes:** Supply a single token or a comma-separated list to run
  numbered instances (`BotName #1`, `BotName #2`, ...).
- **Context sharing:** Up to 10 recent channel messages are cached and shared
  with every instance to preserve conversation memory.
- **Mentions & wakewords:** Detects `@bot` mentions and configurable wakewords
  such as `!help` or `!ping` before invoking an LLM.
- **Voice pipeline (experimental):** Voice activity detection, recording, and
  transcription utilities exist but require explicit command wiring.

## Slack
- **Socket Mode:** Persistent real-time connection with automatic reconnection
  and rate-limit handling.
- **Multi-bot orchestration:** Configure multiple workspaces or personas via the
  `BOTS_*` schema or the WebUI.
- **Channel management:** Auto-joins channels defined in
  `SLACK_JOIN_CHANNELS` and honours per-channel routing rules.
- **Interactive features:** Supports slash commands, message actions, and block
  kit payloads routed through the shared command bus.

## Mattermost (Experimental)
- **REST-first integration:** Uses personal access tokens and REST endpoints for
  message delivery and channel discovery.
- **Multi-team support:** Configure team/channel mappings per bot instance.
- **Feature parity:** Shares context caching and persona prompts with other
  platforms but is gated behind an experimental flag while the API surface
  stabilises.

For instructions on wiring tokens, personas, and routing for any platform, see
[`configuration/overview.md`](../configuration/overview.md) and the dedicated
multi-bot guides.
