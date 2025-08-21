# Open-Hivemind Agent Architecture

## Overview
Open-Hivemind implements a revolutionary multi-agent architecture where each bot instance operates as a neuron in a unified digital consciousness. See [PACKAGE.md](PACKAGE.md) for technical specifications.

## Multi-Agent Modes

### Solo Mode
- Single bot token: `DISCORD_BOT_TOKEN=token1`
- Simple deployment for small servers

### Swarm Mode  
- Multiple tokens: `DISCORD_BOT_TOKEN=token1,token2,token3`
- Auto-numbered instances: "BotName #1", "BotName #2", etc.
- Coordinated responses across instances

## Agent Coordination

### Unified Voice
All agents respond with consistent naming: `*AgentName*: message`

### Context Sharing
- Shared message history (10 messages per channel)
- Cross-instance state synchronization
- Unified LLM provider access

### Instance Management
- Automatic token validation on startup
- Per-instance connection handling
- Graceful error recovery

## Configuration
Agents inherit personality from:
- `MESSAGE_USERNAME_OVERRIDE` - Base agent name
- `config/personas/` - Personality templates
- Environment-specific behavior tuning

## Platform Support
- **Discord**: Full multi-instance support
- **Slack**: Bot management with Socket Mode
- **Mattermost**: Experimental REST integration

For implementation details, see the technical documentation in [PACKAGE.md](PACKAGE.md).

## Development Roadmap
See [TODO.md](TODO.md) for upcoming features including:
- React WebUI configuration system
- Real-time agent monitoring
- Dynamic configuration management
- Enterprise multi-environment support