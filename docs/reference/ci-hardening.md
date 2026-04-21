# CI Hardening Notes

## CI Dashboard

Workflow links:
- [Workflow Lint](../../.github/workflows/workflow-lint.yml)
- [CI Fast (Build & Quality)](../../.github/workflows/ci-fast.yml)
- [Unit Tests](../../.github/workflows/unit-tests.yml)
- [Integration Tests](../../.github/workflows/integration-tests.yml)
- [Playwright Tests](../../.github/workflows/playwright.yml)
- [CI Health Weekly Report](../../.github/workflows/ci-health-weekly.yml)

Triage order:
1. `workflow-lint`
2. `ci-fast`
3. `unit-tests`
4. `integration-tests`
5. `playwright`

## Lint Warning Baseline

- CI uses `pnpm run lint:gate` to fail only on _new_ ESLint warnings.
- Baseline file: `.ci/eslint-warning-baseline.json`
- Regenerate baseline after intentional warning cleanups:
  - `pnpm run lint:baseline:update`

## Type Checking

- `pnpm run check-types` now runs strict `tsc --noEmit` (no `|| true` bypass).

## Audit Policy

- PR fast CI uses `pnpm audit --audit-level=moderate`.
- Main branch fast CI uses `pnpm audit --audit-level=high --production`.
- Nightly workflow runs `pnpm audit --audit-level=low` and can auto-open dependency bump PRs.

## Flaky Test Quarantine

- Quarantined list: `tests/flaky-tests.txt`
- Runner: `pnpm run test:flaky:quarantine`
- Policy check: `pnpm run test:flaky:policy` (blocking on PRs)
- CI runs quarantine tests in non-blocking mode and uploads a summary artifact.
- Entry format:
  - `testPath | owner=@team-or-user | expires=YYYY-MM-DD | reason=short note`
- Expired entries fail CI and must be removed or extended with justification.

## Changed-File Test Selection

- PR fast CI runs `pnpm run test:changed`.
- This selects and runs related tests for changed files to shorten feedback loops.

## Extra Hardening

- Key workflows use `concurrency` with `cancel-in-progress: true` to avoid redundant runs.
- Workflow linting runs via `.github/workflows/workflow-lint.yml` using `actionlint`.
- Weekly CI health reports are posted by `.github/workflows/ci-health-weekly.yml`.
