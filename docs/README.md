# Open Hivemind Admin Documentation

This directory contains documentation for the Admin Interface.

## Guides
- [Bot Management](admin/bots.md)
- [Export & System Data](admin/export.md)

## Development

### Generating Documentation Screenshots

The project includes an automated workflow to generate up-to-date screenshots of the UI using Playwright.

To regenerate screenshots:

1.  Ensure you have the backend and frontend built:
    ```bash
    npm run build
    ```
2.  Run the screenshot generation script:
    ```bash
    npm run generate-docs
    ```

This will run the end-to-end tests located in `tests/e2e/screenshot-*.spec.ts` and save the screenshots to `docs/screenshots/`.
