# Open Hivemind Admin Documentation

This directory contains documentation for the Admin Interface.

## Guides
- [Bot Management](admin/bots.md)
- [Export & System Data](admin/export.md)

## Documentation Maintenance

### Generating Screenshots

To automatically update the screenshots in this documentation (including the User Guide), run the following command from the project root:

```bash
npm run generate-docs
```

This script uses Playwright to capture screenshots of key features and saves them to `docs/screenshots/`.
Ensure you have installed the necessary dependencies (`npm install` and `npx playwright install chromium`) before running this command.
