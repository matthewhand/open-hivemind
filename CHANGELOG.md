## [1.1.0] - 2025-08-14

### Added
- Mattermost parity improvements:
  - Real REST client with `createPost`, `getChannelPosts`, `joinChannel`.
  - Optional WebSocket live events (posted/edited/deleted) with keepalive.
  - Typing indicator flag and wakeword/mention gating.
  - `MattermostMessage` wrapper implementing `IMessage`.
  - File uploads (POST `/files`) and attach `file_ids` to posts.
- Convict-driven configuration classification:
  - Added `level` (basic/advanced) and `group` to Convict schemas across modules.
  - New generator produces `docs/config-reference.md` from Convict schemas.
  - New `docs/config-system.md` to document the approach.
  - Basic/Advanced onboarding docs and `.env.basic` / `.env.advanced` templates.
- Centralized config for optional providers and features:
  - `replicateConfig` for image prediction (model version, prompt, webhook, token).
  - Slack tuning and metadata/history toggles via config (no raw env reads in code paths).
  - Discord circuit breaker thresholds/timeouts configurable.
- CI & quality:
  - `docs:check` script and GitHub Actions to verify config docs are up to date.
  - Additional tests for Mattermost (gating, send-with-files, join/fetch) and webhook validation.

### Changed
- OpenAI provider now uses Convict-configured settings exclusively (no direct env fallbacks in the provider); Convict still maps env vars via schema.
- Removed legacy JSON metadata files; docs generator reads Convict schemas directly.
- README configuration section points to Basic, Advanced, Generated Reference, and Config System overview.

### Notes
- No breaking changes expected for existing env-based setups; Convict continues to read vars via `env` mappings.
- See `docs/config-reference.md` for an exhaustive list of keys with defaults and env names.

