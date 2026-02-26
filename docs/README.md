# Open Hivemind Admin Documentation

This directory contains documentation for the Admin Interface.

## Guides
- [Bot Management](admin/bots.md)
- [Export & System Data](admin/export.md)

## Development

### Generating Screenshots

To update the screenshots in the documentation, you can use the automated screenshot generation workflow.

1.  Ensure you have the necessary dependencies installed:
    ```bash
    npm install
    npx playwright install chromium
    ```

2.  Run the screenshot generation script:
    ```bash
    npm run generate-docs
    ```
    This will launch the application in development mode and capture screenshots of key pages, saving them to `docs/screenshots/`.
