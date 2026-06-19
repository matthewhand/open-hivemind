# Open Hivemind Administrator & Developer Documentation

This directory contains all documentation for Open Hivemind, organized by topic.

## 🌟 Start here
- **[Vision & Status](VISION.md)** — what Open-Hivemind is *for* (a **society of agents**), and an honest, code-grounded account of what's built, partial, and remaining.
- **[Concepts](concepts/README.md)** — the full concept set as an ordered learning path (society → personas → LLM → memory → MCP → guards).
- [How the Society Works](concepts/society-of-agents.md) — the real engagement & coordination mechanics (rolls, social-anxiety penalties, swarm modes, tuning knobs).
- [Personas](concepts/personas.md) — the identity layer: how a persona sets an agent's voice (system prompt) and social temperament (responseBehavior).
- [Guards](concepts/guards.md) — the safety layer: rate limits, content filters, tool-access control, and semantic guardrails, and where each is enforced.
- [Memory](concepts/memory.md) — continuity: pluggable backends (MemVault/Mem0/Mem4AI/Postgres), the provider contract, pipeline read/write, and retention/eviction.
- [MCP Tools](concepts/mcp.md) — external tools: server transports (stdio/HTTP/SSE), discovery/execution, access control, and human-in-the-loop approval.
- [LLM Providers](concepts/llm-providers.md) — the reasoning engine: pluggable backends (OpenAI/Flowise/OpenWebUI/Letta/OpenSwarm), the provider contract, tool-calling/streaming, per-bot profiles.
- [Roadmap](../ROADMAP.md) — code-audited Now/Next/Later checklist · [Feature Status](FEATURE_STATUS.md) — per-feature audit
- [Legacy & superseded architectures](legacy/README.md) — where we came from, and why each design was replaced

## 🧭 Using Open Hivemind
- [User Guide](USER_GUIDE.md)
- [Bot Management](admin/bots.md)
- [Backups & System Data](admin/export.md)
- [Provider Setup Guide](getting-started/provider-setup-guide.md) - Connect LLM and Messenger providers
- [Provider Troubleshooting](getting-started/provider-troubleshooting.md) - Fix common provider issues
- [API Keys Quick Reference](reference/api-keys-quick-reference.md) - Fast access to provider documentation

## 🏗️ Architecture & Core Concepts
- [Architecture Overview](architecture/overview.md)
- [Server Architecture](architecture/unified-server.md)
- [Development Guide](architecture/development.md)
- [Capability-Based Model Routing](CAPABILITY_ROUTING.md) — *proposed*: portable blueprints declare intelligence/speed/cost wants; a resolver maps them to available models

## ⚙️ Operations & Deployment
- [Setup & Bootstrapping](getting-started/setup-guide.md)
- [Deployment Configuration](operations/deployment.md)
- [Netlify Frontend Deployment](operations/deployment-netlify.md)
- [Maintenance Guide](operations/maintenance.md)
- [Security Incident Response](operations/security.md)

## API Reference
- [Bot, Audit, Import/Export & Webhook API](api/bot-and-system-endpoints.md) - Bot lifecycle (toggle, scheduled tasks), durable audit log, config import/export, inbound webhook ingress
- [Pipeline & Config API](api/pipeline-api.md) - Config source introspection, health observability, pipeline activity recording, and trace export
- [LLM Models API](api/llm-models-endpoint.md) - LLM provider model listing with pricing and capabilities

## 📚 Reference & Planning
- [Data Directories & Filesystem Layout](reference/data-directories.md) — where config/state/DB/secrets/logs live, env overrides, and the proposed XDG-aware path resolver
- [Package Specifications & Features](reference/package.md)
- [Project TODOs](reference/todo.md)
- [Bot Management Design](reference/BOT_MANAGEMENT_DESIGN.md)
- [Build Fix Attempts](reference/BUILD_FIX_ATTEMPTS.md)
- [Improvement Roadmap](reference/IMPROVEMENT_ROADMAP.md)
- [Type Safety Roadmap](reference/TYPE_SAFETY_ROADMAP.md)

## 🛠️ Development Tools
### Generating Screenshots
To automatically generate updated screenshots for the documentation, run:
```bash
npm run generate-docs
```

This will run the Playwright screenshot tests and update the images in `docs/screenshots/`.
