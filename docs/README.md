# Open Hivemind Admin Documentation

This directory contains documentation for the Admin Interface.

## Guides
- [Bot Management](admin/bots.md)
- [Export & System Data](admin/export.md)

## Documentation Updates

Screenshots in the documentation are automatically generated using Playwright. To update the screenshots after making UI changes, run:

```bash
npm run generate-docs
```

This will:
1.  Run the E2E tests in `tests/e2e/screenshot-*.spec.ts`.
2.  Capture new screenshots.
3.  Save them to `docs/screenshots/`.

Ensure you have installed the necessary browser binaries first:
```bash
npx playwright install
```
