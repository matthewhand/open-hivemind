# Contributing to Open-Hivemind

Thanks for your interest in contributing! This guide covers everything you need to get a
development environment running and a pull request merged.

## Development setup

**Prerequisites:** Node.js 22 (an `.nvmrc` is provided) and [pnpm](https://pnpm.io/).

```bash
nvm use            # or: nvm install 22
pnpm install
npm run dev
```

`npm run dev` runs the TypeScript backend directly via `tsx` with Vite hot-reloading for the
frontend — **there is no build step**. Do not run `npm run build` or `npm start`; the `dist/`
directory is unmaintained. The server is up when you see
`🎉 Open Hivemind Server startup complete!` in the output.

Useful variants:

- `npm run dev:webui-only` — skip messenger (Discord/Slack/Mattermost) initialization.
- `DEBUG=app:* npm run dev` — verbose logging via the `debug` package.

## Running tests

```bash
npm test                  # unit tests (Jest)
npx playwright test       # end-to-end tests (Playwright)
```

- Run `npm test` before opening a PR; it must pass.
- Tests suppress console output by default — set `ALLOW_CONSOLE=1` to see logs.
- Add or update tests alongside any behavior change.

## Lint and formatting

A pre-commit hook runs [lint-staged](https://github.com/lint-staged/lint-staged), which applies
`eslint --fix` and `prettier --write` to staged files under `src/`, `tests/`, and `packages/`.
You can also run the tools manually:

```bash
npm run lint              # ESLint over src/
npm run format            # Prettier over src/, tests/, packages/
npm run check-types       # TypeScript type check (tsc --noEmit)
```

Style and naming conventions are documented in [docs/CODE_STYLE.md](docs/CODE_STYLE.md).

## Pull requests

- Use [Conventional Commits](https://www.conventionalcommits.org/) for commit messages and PR
  titles, e.g. `feat: add mattermost typing indicator` or `fix(slack): handle empty payloads`.
- Keep PRs focused and well-scoped — one logical change per PR.
- Make sure `npm test`, `npm run lint`, and `npm run check-types` pass.
- Update documentation (`docs/`, feature flags, etc.) when behavior changes.
- Fill in the pull request template checklist.

## Finding something to work on

- [ROADMAP.md](ROADMAP.md) — effort-estimated entry points, from quick wins to larger features.
- [GitHub issues](https://github.com/matthewhand/open-hivemind/issues) — bug reports and feature
  requests; issues labeled `good first issue` are a great place to start.
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — overview of how the pieces fit together.

## Reporting issues

- **Bugs and feature requests:** open a GitHub issue using the provided templates.
- **Security vulnerabilities:** do **not** open a public issue — see [SECURITY.md](SECURITY.md)
  for private reporting channels.

## Code of conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md). By participating, you are
expected to uphold it.
