# Open Hivemind Administrator & Developer Documentation

This directory contains all documentation for Open Hivemind, organized by topic.

## 🧭 Start here
- [**Vision & honest status**](VISION.md) — what we're building toward + a truthful built-vs-remaining snapshot
- [Feature Implementation Status](FEATURE_STATUS.md) — the per-feature audit (307 features, 10 domains)
- [Roadmap](../ROADMAP.md) — code-audited checklist of shipped / partial / planned
- [Glossary](GLOSSARY.md) — core terms (hivemind, persona, guard profile, swarm mode, MCP, pipeline stage, HITL) defined as the code uses them

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
- [Legacy Architecture](architecture/legacy/README.md) - superseded designs (e.g. the monolithic message handler) and why they changed

## ⚙️ Operations & Deployment
- [Setup & Bootstrapping](getting-started/setup-guide.md)
- [Deployment Configuration](operations/deployment.md)
- [Netlify Frontend Deployment](operations/deployment-netlify.md)
- [Maintenance Guide](operations/maintenance.md)
- [File & Directory Locations](operations/file-locations.md) - where config/data/db/backups/logs live, env overrides, and the proposed XDG support
- [Security Incident Response](operations/security.md)

## API Reference
- [Bot, Audit, Import/Export & Webhook API](api/bot-and-system-endpoints.md) - Bot lifecycle (toggle, scheduled tasks), durable audit log, config import/export, inbound webhook ingress
- [Pipeline & Config API](api/pipeline-api.md) - Config source introspection, health observability, pipeline activity recording, and trace export
- [LLM Models API](api/llm-models-endpoint.md) - LLM provider model listing with pricing and capabilities

## 📚 Reference & Planning
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
