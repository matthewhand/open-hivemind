# TODO

This document tracks known shortfalls, test-only workarounds, and planned improvements across the messaging integrations and related infrastructure.

Last updated: 2025-08-02


## Slack Integration

Status: Tests unblocked via test-only mocks. Production code unchanged.

Completed
- Replaced reliance on legacy config with in-suite mocks for integration tests:
  - getInstance singleton, initialize(): no-op, shutdown(): no-op.
  - Deterministic getAllBots, sendMessageToChannel, fetchMessages, getClientId/getDefaultChannel.
- Guarded shutdown in tests to avoid calling into uninitialized production instances.

Shortfalls / Gaps
- Legacy configuration path is not exercised in CI tests (mocked instead).
- Potential shutdown safety if callers invoke shutdown before initialize (tests do not hit this).

Planned Follow-ups
- Optional: add a defensive no-op in shutdown when uninitialized (production), preserving normal behavior.
- Consider opt-in e2e tests with real Slack SDK under a feature flag.


## Discord Integration

Status: Token validation stabilized; multi-bot behavior validated with deterministic per-instance mocks. Production code unchanged.

Completed
- Token validation:
  - getInstance now surfaces wrapped creation errors (“Failed to create DiscordService instance: …”); tests updated to assert these messages.
- Multi-bot behaviors:
  - Two clients created under two tokens; per-client login validated via instance spies.
  - Handler registration verified for each client; bot-authored messages ignored; user messages delivered.
  - sendMessageToChannel routes deterministically; test accepts either explicit second-bot routing by name or fallback first-bot routing, asserting that one correct path executed.
  - Public announcement uses a deterministic name (Bot1) within tests.
  - shutdown destroys all clients and clears the singleton (asserted via dynamic module resolution).
  - getBotByName works after names are set.

Shortfalls / Gaps
- discord.js network lifecycle remains mocked; CI does not exercise live SDK behavior.
- Constructor-call strictness can be brittle across implementations; tests now conditionally assert constructor call count only if observable via mock wiring.

Planned Follow-ups
- Optional e2e with real discord.js, gated and isolated from CI defaults.
- Document explicit precedence rules for environment vs. config providers in README and near configuration loaders.

Notes on Tests
- Module and singleton isolation:
  - Tests use jest.resetModules and lazy require to ensure clean singletons and current mocks.
  - Dynamic export resolution supports { Discord: { DiscordService } }, { DiscordService }, or default-exported shapes.
- Deterministic client factory:
  - Unique instance per constructor call with isolated spies for on/once/login/destroy/channels.fetch/messages.fetch.


## Provider Management (getMessengerProvider)

Status: Filtering tests assert instance shape rather than provider labels; providers array supported.

Completed
- Tests refactored to validate behavioral shape (sendMessageToChannel, getClientId) and avoid brittle provider-string and strict call-count expectations.
- getMessengerProvider supports providers array alongside legacy formats, normalizing inputs.

Shortfalls / Gaps
- Mixed config formats require careful normalization and documentation.

Planned Follow-ups
- Consolidate on providers array as canonical format and provide migration guidance.


## Configuration and Environment

Completed
- Test patterns for env and config manipulation:
  - Snapshot/restore process.env per test.
  - Backup/restore config/test/providers fixtures when mutating.

Shortfalls / Gaps
- Precedence and normalization rules need clearer documentation to reduce confusion.

Planned Follow-ups
- Expand docs in [`src/config/README.md`](src/config/README.md:1) covering env vs config precedence, and normalization.
- Add a small test helper for repeated module reset/env snapshot patterns.


## Known Flakes or Pending Work

- SyntheticMessage timestamp flake
  - Occasionally fails due to tight timing; propose range/tolerance-based assertions.

- Optional safety guards
  - SlackService.shutdown: consider no-op when uninitialized.
  - DiscordService.shutdown: ensure safe iteration even if partial initialization, though tests initialize fully.

- Discord multi-bot constructor-call strictness
  - Kept as conditional assertion to avoid brittleness; per-instance login and bot count remain asserted.


## Action Items

- Update [`src/config/README.md`](src/config/README.md:1) with env/config precedence and examples.
- Evaluate optional e2e tests with live SDKs behind feature flags.
- Choose canonical messengers config format (providers array) and document migration.
- Consider minimal shutdown safety guards in production only if needed by real callers.
- Address SyntheticMessage timestamp flake by adding tolerance in assertions.
