# Open Hivemind Admin Documentation

This directory contains documentation for the Admin Interface.

## Guides
- [Bot Management](admin/bots.md)
- [Export & System Data](admin/export.md)

## Documentation

### Updating Screenshots

The documentation screenshots are automatically generated using Playwright. To update them:

1.  Ensure you have dependencies installed:
    ```bash
    npm install
    npx playwright install chromium
    ```
2.  Run the screenshot generation script:
    ```bash
    npm run generate-docs
    ```
    This will run all e2e screenshot tests and update the images in `docs/screenshots/`.
