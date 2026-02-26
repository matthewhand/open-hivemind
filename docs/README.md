# Open Hivemind Admin Documentation

This directory contains documentation for the Admin Interface.

## Guides
- [Bot Management](admin/bots.md)
- [Export & System Data](admin/export.md)

## Documentation Maintenance

### Generating Screenshots

The screenshots in the documentation are automatically generated using Playwright tests to ensure they reflect the latest UI state.

To update the screenshots, run:

```bash
npm run generate-docs
```

This command will:
1.  Run the E2E screenshot tests (`tests/e2e/screenshot-*.spec.ts`).
2.  Capture full-page screenshots of key features.
3.  Save them to `docs/screenshots/`.
