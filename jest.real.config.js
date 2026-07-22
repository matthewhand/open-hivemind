/**
 * Jest configuration for REAL integration tests that require live external
 * services (a real Postgres/Neon database, real provider APIs, etc.).
 *
 * It extends the base `jest.config.js` but deliberately drops the `^pg$`
 * moduleNameMapper so the database integration suites talk to an actual
 * Postgres instance instead of the in-memory `pg` mock used by unit tests.
 *
 * These suites are gated behind `ALLOW_REAL_SECRETS=true` and a non-placeholder
 * `DATABASE_URL` (see the suites' own guards), so they never run — and never
 * leak secrets — unless a developer explicitly opts in with a provisioned DB.
 *
 * Run with: `npm run test:real` (or set DATABASE_URL + ALLOW_REAL_SECRETS).
 */
const base = require('./jest.config.js');

const moduleNameMapper = Object.fromEntries(
  Object.entries(base.moduleNameMapper).filter(([key]) => key !== '^pg$')
);

module.exports = {
  ...base,
  displayName: 'integration-real',
  // Keep the same transform/roots/setup as base; only swap the pg mapping.
  moduleNameMapper,
};
