# CI Hardening Notes

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
- CI runs this in non-blocking mode and uploads a summary artifact.

## Changed-File Test Selection

- PR fast CI runs `pnpm run test:changed`.
- This selects and runs related tests for changed files to shorten feedback loops.

## Extra Hardening

- Key workflows use `concurrency` with `cancel-in-progress: true` to avoid redundant runs.
- Workflow linting runs via `.github/workflows/workflow-lint.yml` using `actionlint`.
