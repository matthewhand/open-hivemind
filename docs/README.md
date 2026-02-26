# Open Hivemind Admin Documentation

This directory contains documentation for the Admin Interface.

## Guides
- [Bot Management](admin/bots.md)
- [Export & System Data](admin/export.md)
- [User Guide](USER_GUIDE.md)

## Development

### Generating Screenshots

To automatically generate updated screenshots for the documentation, run:

```bash
npm run generate-docs
```

This will run the Playwright screenshot tests and update the images in `docs/screenshots/`.
