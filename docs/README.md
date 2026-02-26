# Open Hivemind Admin Documentation

This directory contains documentation for the Admin Interface.

## Guides
- [Bot Management](admin/bots.md)
- [Export & System Data](admin/export.md)

## Documentation Workflow

### Updating Screenshots

The project includes an automated workflow for generating documentation screenshots using Playwright.

To update all screenshots:
```bash
npm run generate-docs
```

To update a specific screenshot (e.g., Settings):
```bash
npx playwright test tests/e2e/screenshot-settings.spec.ts
```

This ensures that the user guide always reflects the latest UI changes.
