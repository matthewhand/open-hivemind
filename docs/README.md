# Open Hivemind Administrator & Developer Documentation

This directory contains all documentation for Open Hivemind, organized by topic.

## 🧭 Using Open Hivemind
- [User Guide](USER_GUIDE.md)
- [Bot Management](admin/bots.md)
- [Backups & System Data](admin/export.md)
- [Provider Setup Guide](getting-started/provider-setup-guide.md) - Connect LLM and Messenger providers
- [Provider Troubleshooting](getting-started/provider-troubleshooting.md) - Fix common provider issues
- [API Keys Quick Reference](reference/api-keys-quick-reference.md) - Fast access to provider documentation

## 🏗️ Architecture & Core Concepts
- [Architecture Overview](architecture/overview.md)
- [Unified Server Architecture](architecture/unified-server.md)
- [Development Guide](architecture/development.md)

## ⚙️ Operations & Deployment
- [Setup & Bootstrapping](getting-started/setup-guide.md)
- [Deployment Configuration](operations/deployment.md)
- [Netlify Frontend Deployment](operations/deployment-netlify.md)
- [Maintenance Guide](operations/maintenance.md)
- [Security Incident Response](operations/security.md)

## API Reference
- [Pipeline & Config API](api/pipeline-api.md) - Config source introspection, health observability, and pipeline trace endpoints
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
