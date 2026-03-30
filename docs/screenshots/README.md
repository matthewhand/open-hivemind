# Open-Hivemind Screenshots

This directory contains automated visual baselines and screenshots used in the [USER_GUIDE.md](../USER_GUIDE.md) and other documentation files.

## How to Regenerate Screenshots

Screenshots are generated automatically using Playwright to ensure they always reflect the latest state of the UI components and workflows.

To regenerate all screenshots, run:

```bash
npm install
npx playwright test tests/e2e/screenshot-*.spec.ts --project=chromium
```

This will spin up the web server locally (via Vite) and run the end-to-end testing suite to capture the predefined views, modals, and charts.

## Adding New Screenshots

To add a new documentation screenshot:
1. Create a new file in `tests/e2e/` named `screenshot-<feature>.spec.ts`.
2. Use the Playwright test runner to navigate to the feature, interacting with any forms or modals as necessary.
3. If the feature depends on dynamic configurations (like Providers or LLMs), use `page.route` to mock the necessary API endpoints to ensure consistent content generation across test runs.
4. Call `await page.screenshot({ path: 'docs/screenshots/<your-feature>.png', fullPage: true });`
5. Reference the new image inside `docs/USER_GUIDE.md`.

## Documented Pages

Currently, the screenshot suite covers:
- System Settings & Global Defaults
- Bot Creation Wizard & Forms
- Bot Settings & Activity Logs
- Distributed Tracing Waterfall
- E2E Analytics & Dashboard Metrics
- Site mapping & Personas Setup
- API Guard Policies & Rate Limiting Views

For detailed implementation instructions regarding Playwright commands, see the repository root `AGENTS.md` and `tests/e2e/` specifications.
