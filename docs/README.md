# Open Hivemind Admin Documentation

This directory contains documentation for the Admin Interface.

## Guides
- [Bot Management](admin/bots.md)
- [Export & System Data](admin/export.md)

## Documentation

### Updating Screenshots

The documentation includes screenshots generated automatically via Playwright tests. To update these screenshots:

1.  Ensure you have the necessary dependencies:
    ```bash
    npm install
    npx playwright install chromium
    ```
2.  Run the screenshot generation script:
    ```bash
    npm run generate-docs
    ```
    This will update all screenshots in `docs/screenshots/`.
