# Open Hivemind Administrator & Developer Documentation

This directory contains all documentation for Open Hivemind, organized by topic.

## 🧭 Using Open Hivemind
- [User Guide](USER_GUIDE.md)
- [Bot Management](admin/bots.md)
- [Backups & System Data](admin/export.md)

## 📱 Responsive Design
- [Quick Start Summary](RESPONSIVE_SUMMARY.md) - Start here!
- [Quick Reference Card](responsive-quick-reference.md) - One-page cheat sheet
- [Responsive Design Guide](responsive-design.md) - Comprehensive patterns and best practices
- [Migration Guide](responsive-migration-guide.md) - Migrating from legacy hooks
- [Implementation Checklist](responsive-implementation-checklist.md) - Track progress
- [Example Components](examples/ResponsiveComponent.example.tsx) - Working code samples
- [Keyboard Shortcuts Guide](keyboard-shortcuts-guide.md) - Accessibility and navigation

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
