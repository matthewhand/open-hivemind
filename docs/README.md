# Open-Hivemind Documentation Hub

Welcome to the home for all Open-Hivemind guides. This folder captures how the
multi-agent architecture works, how to configure it, and how to extend it across
platforms and LLM providers.

## Feature Highlights
- **Solo & Swarm modes** – switch between single-token deployments and
  auto-numbered multi-instance swarms by editing `DISCORD_BOT_TOKEN` or the
  `BOTS_*` configuration schema.
- **Persona & system instructions** – manage voice, tone, and behaviour through
  `config/personas/`, system prompts, or the WebUI persona editor.
- **Model Context Protocol integration** – connect one or more MCP servers,
  discover tools automatically, and control who can execute them.
- **Tool usage guards** – restrict MCP tool access to channel owners or curated
  allowlists, configurable per agent.
- **Unified voice with shared context** – responses are emitted as
  `*AgentName*: message`, backed by a per-channel cache of the last 10 messages
  that all instances read from.
- **WebUI dashboard** – configure providers, tokens, personas, MCP servers, and
  overrides with real-time status panels that respect environment-variable
  ownership.
- **Platform reach** – production-ready Discord support, Slack Socket Mode
  integration, and experimental Mattermost REST connectivity.

## Quick Navigation
- **Getting Started**
  - [`getting-started/setup-guide.md`](getting-started/setup-guide.md) – prepare
    environment variables and run your first instance.
  - [`getting-started/quickstart.md`](getting-started/quickstart.md) – CLI-focused
    walk-through for new operators.
- **Architecture & Agents**
  - [`architecture/layered-overview.md`](architecture/layered-overview.md) –
    system layers, context sharing, and response orchestration.
  - [`architecture/overview.md`](architecture/overview.md) – sequence diagrams
    and platform integration touchpoints.
  - [`architecture/agents.md`](architecture/agents.md) – hive-mind persona and
    coordination model.
- **Configuration**
  - [`configuration/overview.md`](configuration/overview.md) – config sources,
    environment overrides, personas, and MCP guardrails.
  - [`configuration/multi-bot-setup.md`](configuration/multi-bot-setup.md) –
    Discord swarm specifics and migration notes.
  - [`configuration/multi-instance-setup.md`](configuration/multi-instance-setup.md)
    – BotConfigurationManager and `BOTS_*` schema reference.
  - [`configuration/channel-routing.md`](configuration/channel-routing.md) –
    mapping agent voices to channels.
  - [`configuration/provider-cheatsheet.md`](configuration/provider-cheatsheet.md)
    – OpenAI, Flowise, OpenWebUI, and OpenSwarm configuration flags.
  - [`configuration/dynamic-model-fetching.md`](configuration/dynamic-model-fetching.md)
    – runtime model selection strategies.
  - [`configuration/idle-response.md`](configuration/idle-response.md) –
    low-traffic engagement tuning.
- **Platforms & WebUI**
  - [`platforms/README.md`](platforms/README.md) – Discord, Slack, and
    Mattermost integration notes.
  - [`webui/dashboard-overview.md`](webui/dashboard-overview.md) – WebUI
    dashboards, overrides, and persona management.
- **Monitoring & Operations**
  - [`monitoring/overview.md`](monitoring/overview.md) – health metrics and
    alerting concepts.
  - [`monitoring/api.md`](monitoring/api.md) – REST endpoints powering the
    dashboards.
  - [`operations/dev-startup.md`](operations/dev-startup.md) – dev server
    orchestration (API + WebUI).
  - [`operations/docker-images.md`](operations/docker-images.md) – container
    workflows.
  - [`operations/real-integration-tests.md`](operations/real-integration-tests.md)
    – live provider and platform checks.

## Additional References
- [`PACKAGE.md`](../PACKAGE.md) – exhaustive capability matrix for every
  integration.
- [`reference/todo.md`](reference/todo.md) – roadmap priorities (WebUI
  improvements, real-time monitoring, dynamic configuration, multi-environment
  rollouts).
- [`reference/user-guide.md`](reference/user-guide.md) – end-user walkthroughs
  for day-to-day bot usage.
- [`reference/development.md`](reference/development.md) – engineering guide
  for extending the project.

If a topic is missing or needs clarification, open an issue or submit a PR—this
repository thrives on collaborative documentation.
