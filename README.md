# Open-Hivemind

![Project Logo](path/to/logo.png)

## Overview

Open-Hivemind is a comprehensive, production-ready multi-platform bot framework that orchestrates AI-powered conversations across Discord, Slack, and Mattermost. Built with TypeScript, it features a modular architecture supporting both single-bot and multi-agent swarm deployments. The framework integrates with leading LLM providers (OpenAI, Flowise, OpenWebUI, OpenSwarm) and includes a WebUI dashboard for configuration management. With 100+ test files ensuring reliability, it offers enterprise-grade features including real-time monitoring, hot configuration reload, and container-ready deployment.

## Features

### Multi-Platform Mastery & Simultaneous Connectivity
- **Unified Messaging Fabric:** Seamlessly bridges Discord, Slack, and Mattermost, synchronizing every message, channel, and platform into one cohesive operational consciousness.
- **Real-Time Connectivity:** Ensures no lag and no fuss as messages flow between platforms, creating a dynamic, integrated environment.
- **Platform-Agnostic Presence:** The same intelligent agents operate consistently across all supported platforms, eliminating the need for multiple separate bots.
- **WebUI Dashboard:** Complete web-based configuration and monitoring system with real-time status updates and bot management.

### Future-Proof Expansion
- **Modular Integration:** Easily extend functionality to new platforms such as Telegram, WhatsApp, and beyond with plug-and-play modules—no rewiring required.
- **Current Platforms:** Discord, Slack, Mattermost fully implemented with Telegram structure ready.
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

- **Cross-Platform Listening:** With persistent event monitoring on Discord, Slack, and Mattermost, Open-Hivemind captures every significant message, filtering, parsing, and processing them with acute accuracy.
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
- **Mattermost Support:** REST API integration with team and channel management, bearer token authentication, and multi-team support.

## Robust & Reliable Operation

### Error Resilience & Detailed Diagnostics
- **Graceful Fallbacks:** Error handling is meticulously designed—errors are swallowed like a black hole but logged using the Debug library to provide comprehensive diagnostic data for post-mortem analysis.
- **Real-Time Debug Logs:** With `DEBUG=app:*`, delve into granular logs that capture every significant operation—from client login to shutdown—offering invaluable insight for troubleshooting.
- **Clean Shutdown and Resource Stewardship:** The shutdown procedure meticulously disconnects each agent, ensuring no lingering processes or resource leaks remain.

## Testing & Deployment

### Test Suite Titan
- **Extensive Coverage:** Powered by 100+ Jest test files, Open-Hivemind validates multi-agent synchronization, message scheduling, event mirroring, and the entire operational lifecycle.
- **Real Integration Tests:** Includes live API testing with `npm run test:real` for Discord and Slack integration verification.
- **Proactive Diagnostics:** Every integration point is tested rigorously, from message fetch limits to dynamic response crafting, ensuring reliable performance under diverse conditions.
- **Continuous Integration Ready:** Designed for seamless deployment in Node.js v18+, Open-Hivemind requires minimal setup and scales effortlessly, whether you deploy a single bot or a multi-agent system.

## WebUI Dashboard

Open-Hivemind includes a comprehensive web-based configuration and monitoring system for managing bots and viewing real-time status.

### Configuration Management
- **Real-Time Configuration Viewer:** Hierarchical display of all configuration sources (environment variables, config files, defaults)
- **Configuration Validation:** Live validation with error detection and recommendations
- **Bot Instance Manager:** Add, remove, and configure bot instances through the web interface
- **Hot Reload Support:** Apply configuration changes without restarting the system

### Monitoring & Analytics
- **Live Status Dashboard:** Real-time bot status, connection health, and system metrics
- **WebSocket Updates:** Instant updates for configuration changes and system events
- **API Endpoints:** RESTful APIs for `/api/config`, `/api/bots`, `/api/status`, and `/api/validation`
- **Prometheus Metrics:** Export system metrics in Prometheus format for monitoring

### User Interface Features
- **Responsive Design:** Works on desktop and mobile devices
- **Source Indicators:** Visual indicators showing configuration source (🔧 env, 📁 file, ⚙️ default)
- **Sensitive Data Masking:** Automatic masking of tokens and API keys
- **Interactive Validation:** Real-time feedback on configuration changes

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

## Production Deployment

Open-Hivemind is designed for production deployment with enterprise-grade features and container support.

### Container & Orchestration
- **Docker Support:** Complete containerization with multi-stage builds and optimized images
- **Kubernetes Manifests:** Ready for K8s deployment with health checks and rolling updates
- **Docker Compose:** Local development and production orchestration

### Enterprise Features
- **Hot Configuration Reload:** Apply configuration changes without service interruption
- **Graceful Shutdown:** Proper cleanup of connections and resources
- **Health Monitoring:** Comprehensive health endpoints and metrics export
- **Multi-Environment Support:** Development, staging, and production configurations

### Security & Compliance
- **Credential Management:** Secure token storage with environment isolation
- **Audit Logging:** Configuration change tracking and access logging
- **Rate Limiting:** Built-in protection against API abuse
- **Webhook Security:** Signature verification and IP-based access control

## Future Enhancements

- **React WebUI Frontend:** Complete React application for the WebUI dashboard
- **Database Integration:** Persistent storage for messages, configurations, and analytics
- **Advanced Monitoring:** Enhanced metrics, alerting, and performance optimization
- **Expanded Platform Support:** Telegram and WhatsApp integration
- **Community-Driven Module Development:** Open-Hivemind encourages the development of community plugins and custom modules to continuously evolve the framework.

---

Open-Hivemind continues to evolve. This documentation provides a deep dive into its revolutionary multi-agent architecture and unified messaging fabric—designed to empower developers and end-users alike in managing an interconnected bot ecosystem.

For further technical details, refer to the Development Guide and User Guide sections of this repository.

## Package Specification

For a comprehensive breakdown of all working features, test coverage, and technical capabilities, see [PACKAGE.md](PACKAGE.md).

**Current Status:** Production-ready with 100+ test files, 4 LLM providers, 3 messaging platforms, WebUI backend, and enterprise deployment features.
