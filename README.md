# Open-Hivemind

![Project Logo](path/to/logo.png)

## Overview

Open-Hivemind is not just a bot framework—it is a revolutionary open-source ecosystem that fuses the chaos of multiple messaging platforms into a singular, harmonious AI‐driven symphony. Imagine a digital hivemind—a borg‐like collective of bots—where every agent is a neuron in a vast, unified brain. Built with TypeScript, it transcends traditional bot limitations by offering a modular, extensible architecture that is as easy to deploy as it is to customize. Whether operating as a single bot or a sprawling swarm, Open-Hivemind leverages cutting‐edge LLMs like OpenAI, Flowise, OpenWebUI, or the multi‐agent juggernaut Open‐Swarm to deliver intelligent, context‐aware conversational experiences in real time.

## Features

### Multi-Platform Mastery & Simultaneous Connectivity
- **Unified Messaging Fabric:** Seamlessly bridges Discord and Slack, synchronizing every message, channel, and platform into one cohesive operational consciousness.
- **Real-Time Connectivity:** Ensures no lag and no fuss as messages flow between platforms, creating a dynamic, integrated environment.
- **Platform-Agnostic Presence:** The same intelligent agents operate consistently whether on Slack’s sleek channels or Discord’s vibrant servers, eliminating the need for multiple separate bots.

### Future-Proof Expansion
- **Modular Integration:** Easily extend functionality to new platforms such as Telegram, WhatsApp, and beyond with plug-and-play modules—no rewiring required.
- **Scalable Architecture:** Designed to evolve, Open-Hivemind readily incorporates future technologies and platforms, ensuring long-term viability.

## Discord Integration

### Solo or Swarm Modes
- **Single Bot Simplicity:** Run a single bot using one `DISCORD_BOT_TOKEN` for straightforward management.
- **Multi-Agent Swarm:** Provide comma-separated tokens in `DISCORD_BOT_TOKEN` (e.g., `token1,token2,token3`) to create multiple bot instances. Each instance will automatically be assigned a numbered name (e.g., "BotName #1", "BotName #2").
- **Instance Configuration:**
  - All instances share the same base name from `MESSAGE_USERNAME_OVERRIDE`
  - Each instance maintains its own connection and message handlers
  - Messages can be sent through specific instances by including the numbered name
- **Validation:** The system validates tokens on startup and throws clear errors for:
  - Missing tokens
  - Empty tokens in the comma-separated list
  - No available bot instances

### Channel Omniscience & Multi-Agent Choreography
- **Event-Driven Vigilance:** Listens to every `messageCreate` event across all bot instances, filtering out bot messages to focus on human interactions.
- **Instance-Specific Handling:** Each numbered bot instance maintains its own:
  - Connection state
  - Message handlers
  - Channel mappings
- **Coordinated Responses:** The system ensures responses are routed through the appropriate instance while maintaining a unified context across all interactions.

## Agent Presentation & Dynamic Response Crafting

- **Unified Voice:** All outbound communications are prefixed with the agent's name (e.g., *AgentName*:) creating a consistent, unified presentation.
- **Personalized Yet Collective:** Customize agent names via `DISCORD_USERNAME_OVERRIDE` to inject personality—imagine Jeeves with timeless formality and Mycroft with sly wit, yet both responding as one cohesive unit.
- **Context-Aware Replies:** Agents intelligently weave user input into their responses, echoing content (e.g., `<@user> your message`) to affirm context and engagement, thereby crafting replies that feel both deliberate and dynamic.

## Message Handling

- **Cross-Platform Listening:** With persistent event monitoring on Discord and Slack, Open-Hivemind captures every significant message, filtering, parsing, and processing them with acute accuracy.
- **Wakeword & Mention Detection:** Configurable triggers ensure that the hivemind activates only when necessary. Wakewords such as `!help` or `!ping` prompt immediate, contextually relevant responses.
- **Contextual Memory:** Leverages history retrieval to accumulate up to 10 recent messages per channel, stitching together a rich tapestry of contextual dialogue that informs intelligent response generation.
- **Command Parsing Efficiency:** Developed with extensibility in mind, the command processing routines adapt to new instructions with ease, offering seamless integration of additional features over time.
- **Single-Voice Output:** Despite potentially operating multiple agents, the bot ensures that responses are concise and managed by a singular, coordinated output stream, eliminating redundant chatter.

## Configuration & Agent Orchestration

### Environment-Driven Control
- **Convict-Powered Customization:** Utilizes convict to manage .env files and JSON configurations, providing granular control over tokens, platform behavior, LLM keys, and rate limits.
- **Dynamic Tuning:** Adjust `MESSAGE_RATE_LIMIT_PER_CHANNEL` to prevent message flooding, and enable `MESSAGE_ADD_USER_HINT` for enhanced user engagement.
- **Flexible Agent Mapping:** Assign tokens and usernames dynamically, allowing both single-bot and swarm configurations to operate optimally in their designated environments.

### Platform-Specific Tuning
- **Slack Customization:** Leverages `SLACK_JOIN_CHANNELS` to dictate ingress points into channels, ensuring that the hivemind infiltrates precisely where needed.
- **Discord Integration:** Configures `DISCORD_CHANNEL_ID` and related settings to pin the hivemind to specific hubs, balancing flexibility with precision.

## Robust & Reliable Operation

### Error Resilience & Detailed Diagnostics
- **Graceful Fallbacks:** Error handling is meticulously designed—errors are swallowed like a black hole but logged using the Debug library to provide comprehensive diagnostic data for post-mortem analysis.
- **Real-Time Debug Logs:** With `DEBUG=app:*`, delve into granular logs that capture every significant operation—from client login to shutdown—offering invaluable insight for troubleshooting.
- **Clean Shutdown and Resource Stewardship:** The shutdown procedure meticulously disconnects each agent, ensuring no lingering processes or resource leaks remain.

## Testing & Deployment

### Test Suite Titan
- **Extensive Coverage:** Powered by 33 Jest test suites, Open-Hivemind validates multi-agent synchronization, message scheduling, event mirroring, and the entire operational lifecycle.
- **Proactive Diagnostics:** Every integration point is tested rigorously, from message fetch limits to dynamic response crafting, ensuring reliable performance under diverse conditions.
- **Continuous Integration Ready:** Designed for seamless deployment in Node.js v18+, Open-Hivemind requires minimal setup and scales effortlessly, whether you deploy a single bot or a multi-agent system.

## Channel Routing

Channel prioritization and selection is supported via a feature-flagged ChannelRouter that can score channels and pick the best candidate based on configuration.

- Feature flag: set MESSAGE_CHANNEL_ROUTER_ENABLED=true to enable routing/scoring behavior. When disabled (default), services return 0 for scoreChannel() and preserve legacy behavior.
- Configuration inputs:
  - CHANNEL_BONUSES: per-channel bonus multipliers (CSV or JSON)
  - CHANNEL_PRIORITIES: per-channel integer priorities (CSV or JSON)
- Deterministic tie-breakers: higher bonus wins; then lexicographic channel ID.
- Providers: Discord, Slack, and Mattermost expose supportsChannelPrioritization=true and delegate scoreChannel() to the ChannelRouter when the flag is on.

See the detailed guide with examples:
- docs/channel-routing.md

## Future Enhancements

- **Integrated LLM Improvements:** Future updates will enrich response quality and contextual intelligence, pushing the envelope of chatbot capabilities.
- **Expanded Platform Support:** Roadmap plans include integration with additional messaging platforms such as Telegram and WhatsApp, ensuring a comprehensive, unified messaging ecosystem.
- **Community-Driven Module Development:** Open-Hivemind encourages the development of community plugins and custom modules to continuously evolve the framework.

---

Open-Hivemind continues to evolve. This documentation provides a deep dive into its revolutionary multi-agent architecture and unified messaging fabric—designed to empower developers and end-users alike in managing an interconnected bot ecosystem.

For further technical details, refer to the Development Guide and User Guide sections of this repository.


## Configuration

- Quick start variables: see `docs/basic-settings.md`
- Power-user guide: see `docs/advanced-settings.md`
- Exhaustive reference (generated): see `docs/config-reference.md`
- How it works: see `docs/config-system.md` (Convict schemas are the single source of truth; keys are tagged as basic/advanced for docs and UX)
