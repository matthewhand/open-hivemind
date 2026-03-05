# Open-Hivemind Agent Architecture

Navigation: [Docs Index](../README.md) | [Layered Overview](layered-overview.md) | [Platform Integrations](../platforms/README.md)


## Overview
Open-Hivemind implements a revolutionary multi-agent architecture where each bot instance operates as a neuron in a unified digital consciousness. See [PACKAGE.md](../../PACKAGE.md) for technical specifications.

## Multi-Agent Modes

### Solo Mode
- Single bot token: `DISCORD_BOT_TOKEN=token1`
- Simple deployment for small servers

### Swarm Mode  
- Multiple tokens: `DISCORD_BOT_TOKEN=token1,token2,token3`
- Auto-numbered instances: "BotName #1", "BotName #2", etc.
- Coordinated responses across instances

## Agent Configuration

### Personas and System Instructions
Agents can be configured with different personas that define their behavior and personality:
- **Personas**: Predefined personality templates (e.g., Developer Assistant, Support Agent)
- **System Instructions**: Custom system prompts that override default behavior
- Managed through the WebUI admin panel or configuration files

### MCP Server Integration
Agents can connect to Model Context Protocol (MCP) servers to discover and use external tools:
- **Tool Discovery**: Automatically discover tools available on connected MCP servers
- **Tool Execution**: Execute tools from MCP servers with proper authentication
- **Multi-server Support**: Connect to multiple MCP servers simultaneously
- Managed through the WebUI admin panel

### MCP Tool Usage Guards
Control who can use MCP tools through configurable guards:
- **Owner-based**: Only the forum/channel owner can use MCP tools
- **Custom User List**: Specific user IDs can use MCP tools
- **Flexible Configuration**: Enable/disable guards per agent

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

## WebUI Features
The WebUI provides comprehensive management capabilities:
- **Agent Configuration**: Configure LLM providers, messenger providers, personas
- **Persona Management**: Create, edit, and delete personas
- **MCP Server Management**: Connect to and manage MCP servers
- **Tool Usage Guards**: Configure access controls for MCP tools
- **Real-time Status**: Monitor agent status and connections
- **Env Override Awareness**: Locked fields clearly indicate environment-variable ownership with redacted previews
- **OpenAPI Export**: Download JSON/YAML specs for all WebUI endpoints via `/webui/api/openapi`

For implementation details, see the technical documentation in [PACKAGE.md](../../PACKAGE.md).

## Development Roadmap
See [todo.md](../reference/todo.md) for upcoming features including:
- Enhanced WebUI configuration system
- Real-time agent monitoring
- Dynamic configuration management
- Enterprise multi-environment support
