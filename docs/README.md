# Open Hivemind Admin Documentation

This directory contains documentation for the Admin Interface.

## Guides
- [Bot Management](admin/bots.md)
- [Export & System Data](admin/export.md)

## Documentation Workflow

To update the screenshots used in this documentation, run the following command:

```bash
npm run generate-docs
```

This command executes the Playwright E2E tests (`tests/e2e/screenshot-*.spec.ts`) to capture screenshots of key features and saves them to `docs/screenshots/`.
