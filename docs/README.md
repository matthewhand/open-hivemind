# Open Hivemind Admin Documentation

This directory contains documentation for the Admin Interface.

## Guides
- [Bot Management](admin/bots.md)
- [Export & System Data](admin/export.md)
- [User Guide](../USER_GUIDE.md)

## Documentation Workflow

### Updating Screenshots

The documentation includes automated screenshots generated via Playwright. This ensures that the visual guides are always up-to-date with the latest UI changes.

To update all documentation screenshots, run the following command from the root directory:

```bash
npm run generate-docs
```

This command will:
1.  Execute the Playwright E2E tests located in `tests/e2e/screenshot-*.spec.ts`.
2.  Capture screenshots of key pages (e.g., Settings, Monitoring, Chat).
3.  Save the screenshots to the `docs/screenshots/` directory, overwriting existing files.

**Note**: You may need to build the frontend first (`npm run build:frontend`) and ensure Playwright browsers are installed (`npx playwright install`).

### Adding New Screenshots

To add a new screenshot to the automation workflow:
1.  Create a new test file in `tests/e2e/` (e.g., `screenshot-new-feature.spec.ts`).
2.  Use `page.screenshot({ path: 'docs/screenshots/new-feature.png' })` in your test.
3.  Run `npm run generate-docs` to generate the file.
4.  Reference the new image in your markdown documentation.
