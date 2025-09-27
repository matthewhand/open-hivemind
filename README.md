# Open-Hivemind

[![CI](https://github.com/matthewhand/open-hivemind/workflows/CI/badge.svg)](https://github.com/matthewhand/open-hivemind/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9+-blue.svg)](https://www.typescriptlang.org/)
[![Test Coverage](https://img.shields.io/badge/coverage-74.29%25-green.svg)](https://github.com/matthewhand/open-hivemind)
[![Tests Passing](https://img.shields.io/badge/tests-1337%20passing-brightgreen)](https://github.com/matthewhand/open-hivemind/actions)
[![Docker](https://img.shields.io/badge/docker-ready-blue.svg)](https://hub.docker.com/)

## Table of Contents

- [The Concept](#the-concept)
- [Quick Start](#quick-start)
- [Why Open-Hivemind?](#why-open-hivemind)
- [How It Works](#how-it-works)
- [Deployment Modes](#deployment-modes)
- [Features](#features)
- [Discord Integration](#discord-integration)
- [Slack Integration](#slack-integration)
- [Mattermost Integration](#mattermost-integration)
- [Configuration & Agent Orchestration](#configuration--agent-orchestration)
- [WebUI Dashboard](#webui-dashboard)
- [Testing & Deployment](#testing--deployment)
- [Production Deployment](#production-deployment)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## The Concept

**Open-Hivemind** is a revolutionary multi-platform AI orchestration framework that creates a unified digital consciousness across Discord, Slack, and Mattermost. Imagine having a single intelligent agent that seamlessly operates across all your team's communication platforms, maintaining context, learning from interactions, and providing consistent AI-powered assistance wherever your team works.

### The Problem It Solves
Modern teams use multiple communication platforms, but AI assistance is typically siloed to individual platforms. Open-Hivemind breaks down these barriers by creating a **unified messaging fabric** where:
- One AI agent serves your entire organization
- Context is maintained across all platforms
- Responses are consistent and contextually aware
- Management is centralized and efficient

### The Solution
Open-Hivemind implements a **swarm intelligence architecture** where multiple bot instances work together as neurons in a unified consciousness, providing seamless AI assistance across all your communication channels.

## Quick Start

Get Open-Hivemind running in under 5 minutes:

### Prerequisites
- Node.js 18+
- Discord, Slack, or Mattermost account with bot permissions

### Basic Setup
```bash
# Clone and install
git clone https://github.com/matthewhand/open-hivemind.git
cd open-hivemind
npm install

# Configure environment
cp .env.sample .env
# Edit .env with your bot tokens

# Run the bot
npm start
```

### Unified Development Setup
```bash
# Install dependencies (includes frontend and backend)
npm install

# Development mode with concurrent servers (backend on 3028, Vite on 5173 with API proxy)
npm run dev

# Production build (builds backend and frontend)
npm run build

# Production start (serves frontend from /uber)
npm start
```

### Advanced Setup Options
```bash
# Backend-only development
npm run dev:backend

# Frontend-only development (Vite dev server with API proxy to backend)
npm run dev:frontend

# Run tests before starting
npm test && npm start

# Production deployment
npm run build
npm run start
```

### Docker Deployment
```bash
# Build and run with Docker
docker build -t open-hivemind .
docker run -p 3000:3000 --env-file .env open-hivemind

# Or use Docker Compose
docker-compose up -d
```

### Configuration Examples

#### Discord Bot (Single Instance)
```env
DISCORD_BOT_TOKEN=your_discord_bot_token_here
MESSAGE_USERNAME_OVERRIDE=MyBot
DISCORD_CHANNEL_ID=123456789012345678
```

#### Discord Swarm (Multiple Bots)
```env
DISCORD_BOT_TOKEN=token1,token2,token3
MESSAGE_USERNAME_OVERRIDE=SwarmBot
```

#### Slack Integration
```env
SLACK_BOT_TOKEN=xoxb-your-slack-bot-token
SLACK_SIGNING_SECRET=your-slack-signing-secret
SLACK_JOIN_CHANNELS=general,random,dev
```

#### OpenAI Integration
```env
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_MODEL=gpt-4
OPENAI_MAX_TOKENS=2000
```

## How It Works

Open-Hivemind creates a **unified messaging fabric** that connects multiple communication platforms into a single AI-powered ecosystem. Here's how the concept translates into reality:

### Core Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Discord       │    │     Slack       │    │   Mattermost    │
│   Integration   │    │   Integration   │    │   Integration   │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │    Message Handler     │
                    │  (Input Sanitization)  │
                    └────────────┬───────────┘
                                 │
                    ┌────────────▼────────────┐
                    │   LLM Providers        │
                    │ OpenAI │ Flowise │ ... │
                    └────────────┬───────────┘
                                 │
                    ┌────────────▼────────────┐
                    │   Response Router      │
                    │  (Rate Limiting)       │
                    └────────────────────────┘
```

### Key Capabilities
- **Multi-Platform Connectors:** Discord, Slack, Mattermost integrations
- **Centralized Message Processing:** Input validation, sanitization, and routing
- **LLM Provider Abstraction:** Unified interface for AI services
- **Enterprise Features:** Monitoring, security, configuration management

## Why Open-Hivemind?

### The Multi-Platform Challenge
Traditional AI assistants are limited to single platforms, creating fragmented experiences:
- Different AI personalities across platforms
- Lost context when switching channels
- Duplicate setup and management overhead
- Inconsistent responses and behavior

### The Open-Hivemind Advantage
- **Unified Intelligence:** One AI agent, consistent across all platforms
- **Context Preservation:** Conversations flow seamlessly between Discord, Slack, and Mattermost
- **Centralized Management:** Single configuration, monitoring, and control
- **Enterprise-Ready:** Production-grade security, monitoring, and scalability

### Perfect For
- **Development Teams:** Code reviews, documentation, debugging across platforms
- **Support Teams:** Consistent AI assistance in customer channels
- **Communities:** Unified moderation and engagement across platforms
- **Enterprises:** Secure, monitored AI deployment with audit trails

## Deployment Modes

### Single Bot Mode
Perfect for small teams or single-platform usage:
- One bot token, simple configuration
- Direct platform integration
- Easy setup and management

### Swarm Mode
Enterprise-grade multi-agent deployment:
- Multiple bot instances for redundancy
- Load balancing across platforms
- High availability and scalability
- Advanced monitoring and management

### Hybrid Mode
Mix and match based on your needs:
- Different configurations per platform
- Selective feature enablement
- Gradual rollout capabilities

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

## Slack Integration

### Bot Setup & Authentication
- **App Creation:** Create a Slack app at [api.slack.com/apps](https://api.slack.com/apps)
- **Bot Token:** Generate `xoxb-` bot token with appropriate scopes
- **Signing Secret:** Required for webhook verification
- **Socket Mode:** Optional for enhanced real-time communication

### Channel Management
- **Auto-Join:** Configure `SLACK_JOIN_CHANNELS` for automatic channel joining
- **Permission Scopes:** `channels:read`, `chat:write`, `im:read`, `mpim:read`
- **Event Subscriptions:** `message.channels`, `message.groups`, `message.im`

### Real-Time Features
- **WebSocket Connections:** Persistent connections for instant messaging
- **Event Processing:** Real-time message parsing and response generation
- **Rate Limiting:** Built-in Slack API rate limit handling

## Mattermost Integration

### Server Configuration
- **REST API:** Full REST API integration with Mattermost servers
- **Personal Access Tokens:** Secure authentication via PAT
- **Team Support:** Multi-team and multi-channel support
- **Webhook Integration:** Optional webhook-based messaging

### Authentication & Security
- **Bearer Token Auth:** Secure API authentication
- **Permission Levels:** User, system admin, team admin support
- **SSL/TLS:** Full HTTPS support for secure communications

### Advanced Features
- **Channel Management:** Create, join, and manage channels programmatically
- **User Management:** User lookup, role management, and permissions
- **Real-Time Events:** WebSocket-based real-time messaging
- **File Attachments:** Support for file uploads and downloads

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

Open-Hivemind includes a powerful, intuitive web interface for monitoring and managing your agents. The UI is designed to provide a comprehensive overview of your system at a glance, while also offering detailed configuration options in a secure, dedicated section.

### The Unified Dashboard (`/`)

The main dashboard, accessible at the root of the application, provides a real-time, unified view of your entire agent ecosystem. It is designed for monitoring and quick actions.

- **Agent Control Center:** A central grid displaying all configured agents with their current status (Online, Offline, Error), live metrics (message counts, LLM token usage), and controls to start or stop agents.
- **System-Wide Analytics:** Interactive graphs showing aggregate message volume, LLM usage, and error rates across all agents.
- **Global Activity Feed:** A real-time log of important system-wide events.
- **Activity Monitoring:** Filterable activity logs with time-based filtering and agent/provider filtering
- **Performance Charts:** Visualizations of system performance metrics including response times, memory usage, and CPU utilization

### The Admin Section (`/admin`)

A secure, dedicated section for all configuration and management tasks. Access to this section requires authentication.

- **Agent Management:** A detailed table for performing full CRUD (Create, Read, Update, Delete) operations on your agents.
- **Connection Configuration:** An intuitive interface for adding, removing, and configuring connections for each agent, including selecting message and LLM providers from dropdowns.
- **Persona Management:** Create and manage different agent personas with custom system instructions.
- **MCP Server Integration:** Connect to Model Context Protocol servers to discover and use external tools.
- **Tool Usage Guards:** Configure access controls for MCP tools with owner-based or custom user list permissions.
- **Environment Variable Monitoring:** View and manage environment variable overrides with automatic redaction of sensitive values.
- **Global Settings:** A centralized location for managing global application settings, provider API keys, and other administrative tasks.
- **Activity Analysis:** Detailed filtering and analysis tools for monitoring agent activity with per-provider and per-agent breakdowns

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

## Troubleshooting

### Common Issues

#### Bot Not Responding
```bash
# Check bot status
curl http://localhost:3000/health

# Enable debug logging
DEBUG=app:* npm start

# Check configuration
npm run validate
```

#### Connection Issues
- **Discord:** Verify bot token and permissions in Discord Developer Portal
- **Slack:** Check app credentials and OAuth scopes
- **Mattermost:** Validate personal access token and server URL

#### Rate Limiting
```bash
# Adjust rate limits in .env
MESSAGE_RATE_LIMIT_PER_CHANNEL=10
MESSAGE_RATE_LIMIT_WINDOW_MS=60000
```

#### Memory Issues
```bash
# Monitor memory usage
npm run start:dev

# Adjust Node.js memory limit
node --max-old-space-size=512 dist/src/index.js
```

### Debug Commands
```bash
# Full debug output
DEBUG=* npm start

# Platform-specific debugging
DEBUG=app:discord:* npm start
DEBUG=app:slack:* npm start
DEBUG=app:mattermost:* npm start
```

### Performance Tuning
- **Reduce message history:** Set `MESSAGE_HISTORY_LIMIT=5`
- **Enable channel routing:** Set `MESSAGE_CHANNEL_ROUTER_ENABLED=true`
- **Adjust LLM timeouts:** Configure provider-specific timeouts

## Contributing

### Development Setup
```bash
git clone https://github.com/matthewhand/open-hivemind.git
cd open-hivemind
npm install
npm run start:dev
```

### Code Standards
- **TypeScript:** Strict type checking enabled
- **ESLint:** Zero warnings, consistent code style
- **Testing:** 80%+ coverage required for new features
- **Documentation:** JSDoc for all public APIs

### Testing
```bash
# Run full test suite
npm test

# Run with coverage
npm run test:coverage

# Run specific tests
npm test -- --testPathPattern=ErrorHandler

# Real API testing (requires tokens)
npm run test:real
```

### Pull Request Process
1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** changes (`git commit -m 'Add amazing feature'`)
4. **Push** to branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Development Guidelines
- **Security First:** All changes reviewed for security implications
- **Backward Compatibility:** Maintain API compatibility
- **Performance:** Profile and optimize new features
- **Documentation:** Update docs for any user-facing changes

## Support

### Community Support
- **GitHub Issues:** [Report bugs and request features](https://github.com/matthewhand/open-hivemind/issues)
- **Discussions:** [Community discussions](https://github.com/matthewhand/open-hivemind/discussions)
- **Documentation:** [Full documentation](https://github.com/matthewhand/open-hivemind/tree/main/docs)

### Professional Support
For enterprise deployments and custom integrations:
- **Email:** matthew.hand.au@gmail.com
- **LinkedIn:** [Matthew Hand](https://linkedin.com/in/matthewhandau)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

### Permissions
- ✅ **Commercial Use:** Licensed for commercial use
- ✅ **Modification:** Modify and distribute modified versions
- ✅ **Distribution:** Distribute original or modified versions
- ✅ **Private Use:** Use privately without restrictions

### Conditions
- 📄 **License Notice:** Include copyright notice in distributions
- 📄 **License Text:** Include MIT license text in distributions

### Limitations
- ❌ **Liability:** No warranty or liability from authors
- ❌ **Trademark:** No trademark rights granted

---

Open-Hivemind continues to evolve. This documentation provides a deep dive into its revolutionary multi-agent architecture and unified messaging fabric—designed to empower developers and end-users alike in managing an interconnected bot ecosystem.

For further technical details, refer to the Development Guide and User Guide sections of this repository.

## Performance & Quality Metrics

### Test Coverage
- **Statements:** 74.29%
- **Branches:** 62.50%
- **Functions:** 72.16%
- **Lines:** 74.89%
- **Total Tests:** 1,337 passing tests
- **Test Suites:** 109 passed
- **Critical Components:** 97.82% coverage (ErrorHandler)
- **Security Components:** 87.76% coverage (SecureConfigManager)

### Quality Assurance
- **ESLint:** Zero errors, minimal warnings
- **TypeScript:** Strict mode enabled
- **Security:** 6 vulnerabilities (down from 16)
- **Documentation:** 100% JSDoc coverage for core APIs

### Security
- **Vulnerabilities Resolved:** 10/16 (62.5% improvement)
- **Input Sanitization:** XSS protection, SQL injection prevention
- **Rate Limiting:** Built-in abuse prevention
- **Encryption:** AES-256-GCM for sensitive data
- **Error Boundaries:** Graceful failure handling

### Performance Benchmarks
- **Message Processing:** < 100ms average response time
- **Memory Usage:** Efficient resource management
- **Concurrent Connections:** Multi-platform simultaneous handling
- **Error Recovery:** < 5 second recovery time

## Package Specification

For a comprehensive breakdown of all working features, test coverage, and technical capabilities, see [PACKAGE.md](PACKAGE.md).

**Current Status:** Enterprise-grade with 1,337 passing tests, 4 LLM providers, 3 messaging platforms, WebUI backend, performance monitoring, and production deployment features.

## TODO: Orphaned and Unfinished Features

These areas contain orphaned code or unfinished integrations identified during analysis. They are gated by configuration or commented out, and should be either completed, integrated, or removed.

### High Impact (Full Modules)
- **src/integrations/mattermost/** (entire directory): Gated by MESSAGE_PROVIDER; no instantiation in typical configs. TODO: Complete Mattermost integration or remove if deprecated.
- **src/integrations/telegram/** (entire directory): No references or imports in production code. TODO: Implement Telegram support or prune the module.

### Medium Impact (Classes/Functions)
- **Voice Classes**:
  - VoiceCommandHandler ([src/integrations/discord/voice/voiceCommandHandler.ts](src/integrations/discord/voice/voiceCommandHandler.ts)): Internal uses but no main triggers; imports commented in DiscordService.ts. TODO: Integrate voice command handling or remove.
  - AudioRecorder ([src/integrations/discord/voice/audioRecorder.ts](src/integrations/discord/voice/audioRecorder.ts)): No usages found; voice feature incomplete. TODO: Complete audio recording for voice or delete.
  - VoiceActivityDetection ([src/integrations/discord/voice/voiceActivityDetection.ts](src/integrations/discord/voice/voiceActivityDetection.ts)): Used internally but voice not activated. TODO: Enable voice activity detection or prune.
- **Voice Functions**:
  - DiscordService.joinVoiceChannel/leaveVoiceChannel/getVoiceChannels ([src/integrations/discord/DiscordService.ts](src/integrations/discord/DiscordService.ts)): No production calls; voice features initialized but not triggered. TODO: Add triggers for voice channel management or remove methods.
- **LLM Function**:
  - generateCompletion() in OpenAI ([src/integrations/openai/openAiProvider.ts](src/integrations/openai/openAiProvider.ts)): Supported but not invoked in main message flow; handleMessage uses chat completion only. TODO: Integrate non-chat completions if needed or remove support.