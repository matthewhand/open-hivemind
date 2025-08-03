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

### Cross-Platform Abstraction Priority: Move Discord-specific features into message-layer interfaces

Rationale: Features like “channel bonuses” should live at the platform-agnostic message abstraction so all integrations (Slack, Mattermost, Discord, OpenWebUI proxies, future providers) benefit uniformly.

Plan:
- Define platform-agnostic channel scoring/bonuses in message config and interfaces:
  - Add to [`src/config/messageConfig.ts`](src/config/messageConfig.ts:1) a schema for CHANNEL_BONUSES and CHANNEL_PRIORITIES supporting aliases and per-context weights.
  - Extend [`src/message/interfaces/IMessengerService.ts`](src/message/interfaces/IMessengerService.ts:1) with optional capabilities discovery (supportsChannelPrioritization: boolean) and a uniform “scoreChannel(channelId, metadata?)” API.
  - Extend [`src/message/interfaces/IMessage.ts`](src/message/interfaces/IMessage.ts:1) with a provider-agnostic “getChannelId()”, “getGuildOrWorkspaceId()” and “getMentions()” that already exists but ensure consistent types across providers.
- Centralize routing logic:
  - Introduce [`src/message/routing/ChannelRouter.ts`](src/message/routing/ChannelRouter.ts:1) to compute channel scores from config and metadata, independent of provider.
  - Deprecate provider-specific bonus logic in Discord; use ChannelRouter everywhere (Discord, Slack, others).
- Config migration and compatibility:
  - Add a migration layer in [`src/config/ConfigurationManager.ts`](src/config/ConfigurationManager.ts:1) to map legacy DISCORD_CHANNEL_BONUSES to message-level CHANNEL_BONUSES if present.
  - Document precedence: message-level config > legacy provider-specific fields.
- Tests:
  - Add cross-provider tests in [`tests/message/routing/ChannelRouter.test.ts`](tests/message/routing/ChannelRouter.test.ts:1) verifying identical behavior across mocked Slack/Discord providers.
  - Contract tests to ensure providers correctly surface channelId/workspace identifiers to enable scoring.
## Targeted TODOs From 10-File Code Review (Batch 1)

1) [`src/config/discordConfig.ts`](src/config/discordConfig.ts:1)
- Validate DISCORD_CHANNEL_BONUSES numeric range (e.g., 0.0–2.0) and add schema docs/examples.
- Accept JSON object format for bonuses in addition to comma-separated strings; auto-detect/parse.
- Add debug namespace logging on successful load/validation for parity with other configs.

2) [`src/integrations/openai/OpenAiService.ts`](src/integrations/openai/OpenAiService.ts:1)
- Implement exponential backoff with jitter for 429/5xx; classify errors (rate-limit, transient, fatal).
- Redact PII/large payloads in request/response logs; centralize a redaction util.
- Add optional streaming support flag with tests for streaming vs non-streaming paths.

3) [`src/integrations/slack/SlackService.ts`](src/integrations/slack/SlackService.ts:1)
- Add rate-limit aware send queue with concurrency control to prevent 429s.
- Normalize error taxonomy and debug logs across Web API vs Events API.
- Integration tests for retryable vs non-retryable Slack API failures.

4) [`src/integrations/discord/DiscordService.ts`](src/integrations/discord/DiscordService.ts:1)
- Add circuit breaker around fetchMessages/sendMessageToChannel to handle Discord outages.
- Cache channel lookups and add concurrency limits for bulk operations.
- Improve error messages with guild/channel context; validate channel existence/permissions upfront.

5) [`src/message/helpers/commands/commandRouter.test.ts`](src/message/helpers/commands/commandRouter.test.ts:1)
- Add negative tests for unknown commands and permission errors.
- Introduce test data builders/factories for commands to reduce duplication.
- Validate telemetry hooks (timing, success/failure counters) are invoked.

6) [`src/llm/getLlmProvider.ts`](src/llm/getLlmProvider.ts:1)
- Add provider compatibility checks (supportsCompletion vs supportsChatCompletion) with warnings.
- Provider-specific enable/disable and precedence overrides in config.
- Health-check probes at startup to fail fast on misconfiguration.

7) [`src/webhook/routes/webhookRoutes.ts`](src/webhook/routes/webhookRoutes.ts:1)
- Validate request body schema with zod/ajv and return 400 with error details.
- Replace raw JSON.stringify debug with structured and redacted fields.
- Parameterize target announcement channel instead of empty default.

8) [`src/integrations/openwebui/openWebUIProvider.ts`](src/integrations/openwebui/openWebUIProvider.ts:1)
- Make Authorization header configurable via config, with redaction in logs.
- Configure axios timeouts, retries with backoff, and a circuit breaker; classify axios errors.
- Preserve role mapping for history (system/assistant/user) instead of assuming user for all.

9) [`src/integrations/flowise/flowiseProvider.ts`](src/integrations/flowise/flowiseProvider.ts:1)
- Validate required metadata (channelId, optional userId) with a small schema and actionable errors.
- Add telemetry for requests, errors, latency; include REST vs SDK mode dimension.
- Contract tests for REST and SDK clients with mock servers.

10) [`src/message/processing/processIncomingMessage.ts`](src/message/processing/processIncomingMessage.ts:1)
- Add idempotency keys to avoid double-processing the same event.
- Propagate tracing context from entrypoint through LLM/provider calls.
- Implement backpressure handling when downstream providers are saturated.

## Targeted TODOs From 10-File Code Review (Batch 2)

1) [`src/common/errors/errorMessages.ts`](src/common/errors/errorMessages.ts:1)
- Ensure error codes map is exhaustive and typed (e.g., string literal types) to prevent typos and missing keys.
- Add i18n-ready structure or simple placeholder to allow future localization of user-facing error messages.
- Create tests verifying that all exported error codes have non-empty, properly formatted messages.

2) [`src/common/errors/getRandomErrorMessage.ts`](src/common/errors/getRandomErrorMessage.ts:1)
- Seedable randomness for deterministic test behavior; allow dependency-injected RNG.
- Add minimum variety guard to avoid repeating same message N times in a row.
- Extend tests to cover edge cases: empty pool, single-item pool, and long-run distribution sanity.

3) [`src/common/errors/handleError.ts`](src/common/errors/handleError.ts:1)
- Normalize error taxonomy (Operational vs Programmer) and map to log levels and telemetry tags.
- Add redaction pass via [`src/common/redactSensitiveInfo.ts`](src/common/redactSensitiveInfo.ts:1) before logging/returning messages.
- Provide safe user-facing summaries separate from developer detail; unit tests for both paths.

4) [`src/common/getEmoji.ts`](src/common/getEmoji.ts:1)
- Validate emoji existence and add fallback behavior to avoid sending undefined characters.
- Support platform-specific substitutions (Slack vs Discord) with a compatibility map.
- Add tests to ensure consistent emoji output across supported platforms.

5) [`src/common/getRandomDelay.ts`](src/common/getRandomDelay.ts:1)
- Switch to jitter strategies (full, equal, decorrelated) selectable via param for backoff scenarios.
- Clamp min/max and validate inputs; add monotonicity tests for backoff sequences.
- Provide deterministic mode for tests via injected RNG.

6) [`src/common/logger.ts`](src/common/logger.ts:1)
- Implement adapter pattern supporting debug, console, and optional JSON-structured logging.
- Add child logger with context (requestId, channelId); ensure redaction is applied centrally.
- Include lightweight benchmark to measure overhead with/without JSON mode.

7) [`src/common/redactSensitiveInfo.ts`](src/common/redactSensitiveInfo.ts:1)
- Expand redaction patterns (API keys, bearer tokens, emails, webhook secrets) and add unit tests.
- Provide partial redaction strategy (last 4 chars visible) to aid debugging without leaking secrets.
- Add safe stringifier that truncates long arrays/objects and redacts recursively.

8) [`src/config/BotConfigurationManager.ts`](src/config/BotConfigurationManager.ts:1)
- Document precedence rules (env > file > defaults) and add validation errors with actionable hints.
- Add schema versioning and migration hooks for future config evolutions.
- Expose a dry-run validation CLI entry to validate config files in CI pre-merge.

9) [`src/config/ConfigurationManager.ts`](src/config/ConfigurationManager.ts:1)
- Add caching with invalidation on environment changes (for tests) to avoid stale reads.
- Emit debug logs on source of each value (env vs config file) for traceability.
- Provide typed getters with defaults and narrow types to reduce runtime casts.

10) [`src/config/debugEnvVars.ts`](src/config/debugEnvVars.ts:1)
- Centralize DEBUG namespace documentation and export a helper to enable groups by feature.
- Add sanity checks to warn on too-broad DEBUG enabling in production builds.
- Unit test matrix to ensure expected namespaces are included/excluded based on flags.

### Targeted TODOs From 10-File Code Review (Batch 2 — Continuation 2)

1) [`src/config/README.md`](src/config/README.md:1)
- Add a precedence table (env > config file > defaults) with concrete examples and conflict resolution notes.
- Document all debug namespaces and show how to enable selectively via [`src/config/debugEnvVars.ts`](src/config/debugEnvVars.ts:1).
- Include migration notes for legacy fields to new message-level config (CHANNEL_BONUSES/PRIORITIES).

2) [`src/config/configurationManager.js`](src/config/configurationManager.js:1)
- Deprecate CommonJS shim; re-export from TypeScript source with type-checked builds.
- Add runtime guards for missing config files with actionable error messages and links to README.
- Unit tests ensuring parity with [`src/config/ConfigurationManager.ts`](src/config/ConfigurationManager.ts:1).

3) [`src/config/debugEnvVars.ts`](src/config/debugEnvVars.ts:1)
- Provide helper enableDebugFor(featureGroup: string) mapping to known namespaces.
- Warn if DEBUG matches a catch-all (e.g., *) in production; add safe defaults in tests.
- Tests for namespace grouping and conflict handling.

4) [`src/config/default.json`](src/config/default.json:1)
- Validate schema with a JSON Schema file checked in; CI step to verify.
- Add comments/docfile listing each key and its type/default; ensure sensitive defaults are not present.
- Provide minimal sample configs for providers in config/providers/*.example.json.

5) [`src/config/discordConfig.ts`](src/config/discordConfig.ts:1)
- Add coercion/validation for potential legacy DISCORD_CHANNEL_BONUSES into message-level bonuses (deprecation warning).
- Emit debug logs for loaded tokens/bot names with redaction; add stricter type guards.
- Tests for env vs file precedence and deprecation mapping.

6) [`src/config/environment.ts`](src/config/environment.ts:1)
- Centralize safeEnv accessor with type narrowing and defaulting; avoid direct process.env reads elsewhere.
- Add allowlist of env variables used; warn on unexpected keys in CI.
- Tests covering missing vars, defaults, and overrides.

7) [`src/config/flowiseConfig.README.md`](src/config/flowiseConfig.README.md:1)
- Document REST vs SDK modes with config flags and examples.
- Clarify timeouts/retry behavior and recommended values for CI vs prod.
- Add security note on redacting secrets in logs.

8) [`src/config/flowiseConfig.ts`](src/config/flowiseConfig.ts:1)
- Add convict formats for URLs, timeouts, and retries; include backoff strategy selection.
- Redact secrets on debug print; validate mutually exclusive REST/SDK settings.
- Unit tests for invalid/missing values and edge cases.

9) [`src/config/llmConfig.README.md`](src/config/llmConfig.README.md:1)
- Expand examples for chat vs completion providers, including hybrid setups.
- Document model selection precedence and provider capability checks.
- Provide troubleshooting guide for common misconfigurations.

10) [`src/config/llmConfig.ts`](src/config/llmConfig.ts:1)
- Add schema for provider capability flags (supportsChatCompletion/supportsCompletion).
- Validate default model by provider; warn on unknown models with suggestion list.
- Tests for capability-driven routing and failure modes.

### Targeted TODOs From 10-File Code Review (Batch 2 — Continuation)

A) [`src/commands/slash/config.js`](src/commands/slash/config.js:1)
- Convert CommonJS to TypeScript/ESM for consistency; export types for command shape.
- Add argument validation and error handling; return structured result object instead of string.
- Unit test: verify execute() behavior and edge cases (no args, invalid args).

B) [`src/common/errors/errorMessages.ts`](src/common/errors/errorMessages.ts:1)
- Enforce strict key typing via a union of error codes and Record mapping; add a build-time completeness check.
- Provide developer vs user-facing message variants; ensure no secrets leak in user messages.
- Tests to assert every key has both variants and placeholders are validated.

C) [`src/common/errors/getRandomErrorMessage.ts`](src/common/errors/getRandomErrorMessage.ts:1)
- Inject RNG for determinism; add sliding-window repeat-avoidance logic with configurable window size.
- Handle empty/undefined pools safely and return a sensible default.
- Property tests (e.g., fast-check) for distribution sanity if feasible.

D) [`src/common/errors/handleError.ts`](src/common/errors/handleError.ts:1)
- Introduce an ErrorInfo interface; map known error types to telemetry fields.
- Apply redactSensitiveInfo to both message and metadata; ensure large objects are truncated.
- Add path that surfaces a correlationId/requestId when available.

E) [`src/common/getEmoji.ts`](src/common/getEmoji.ts:1)
- Ensure deterministic seeding in tests and allow filtering by category/platform.
- Provide fallback emoji when list is empty; add bounds checks.
- Add table-driven tests to validate outputs across categories/platforms.

F) [`src/common/getRandomDelay.ts`](src/common/getRandomDelay.ts:1)
- Add decorators for equal-jitter and decorrelated jitter; export typed strategy enum.
- Validate params (non-negative, min <= max); expose clamp helper.
- Unit tests for monotonicity under backoff sequences and boundary conditions.

G) [`src/common/logger.ts`](src/common/logger.ts:1)
- Provide a pluggable transport interface (console, debug, JSON); add redaction middleware.
- Implement child logger with inherited context; pass through to transports.
- Micro-benchmark (jest) to approximate overhead; assert under threshold in CI.

H) [`src/common/redactSensitiveInfo.ts`](src/common/redactSensitiveInfo.ts:1)
- Expand regex set (Bearer, API keys, emails, IPs); support partial redaction tails.
- Add safeStringify with depth/length limits and circular reference handling.
- Tests for nested structures and mixed content redaction.

I) [`src/config/BotConfigurationManager.ts`](src/config/BotConfigurationManager.ts:1)
- Emit structured validation errors listing missing/invalid fields with remediation hints.
- Add schema version detection and migration hooks stub; tests for version mismatch.
- CLI entry: uv run node scripts/config-validate.ts to validate configs in CI.

J) [`src/config/ConfigurationManager.ts`](src/config/ConfigurationManager.ts:1)
- Add per-key source-trace logging (env vs file vs default) under debug flag.
- Introduce typed accessors with default values; deprecate untyped getters.
- Cache invalidation mechanism for tests (reset method); unit tests covering cache behavior.
