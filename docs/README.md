# Open Hivemind Admin Documentation

This directory contains documentation for the Admin Interface.

## Guides
- [User Guide](../USER_GUIDE.md)
- [Bot Management](admin/bots.md)
- [Export & System Data](admin/export.md)

## Development

### Updating Documentation Screenshots

This project uses Playwright to automatically generate and maintain documentation screenshots.

To update all screenshots:
```bash
npm run generate-docs
```

To update a specific screenshot (e.g., Settings):
```bash
npx playwright test tests/e2e/screenshot-settings.spec.ts
```
