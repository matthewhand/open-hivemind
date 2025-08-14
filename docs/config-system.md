# Configuration System Overview

Open‑Hivemind uses Convict as the single source of truth for configuration.

Key points
- Types and validation: Each config module defines keys via Convict with `format`, `default`, and `env`.
- Classification: Keys include two additional fields used for docs and UX only:
  - `level`: `basic` or `advanced` (or `experimental` in the future)
  - `group`: logical area like `app`, `message`, `routing`, `rate`, `discord`, `slack`, `mattermost`, `llm`, `webhook`
- Optional integrations: Slack, Mattermost, Flowise, OpenWebUI are optional providers; only set their keys if you use them.

Where to find configs
- App/server: `src/config/appConfig.ts`
- Messaging behavior & routing: `src/config/messageConfig.ts`
- Providers (optional): `src/config/discordConfig.ts`, `src/config/slackConfig.ts`, `src/config/mattermostConfig.ts`
- LLMs: `src/config/openaiConfig.ts`, `src/config/flowiseConfig.ts`, `src/config/openWebUIConfig.ts`
- Webhooks: `src/config/webhookConfig.ts`
- Slack send queue tuning: `src/config/slackTuning.ts` (optional)

Docs generation
- Run `npm run docs:config` to regenerate `docs/config-reference.md` from Convict schemas.
- The generator reads `config.getSchema().properties` and includes: key, description, `env=...`, and default.
- Basic vs Advanced sections are derived from the `level` field.

Authoring guidelines
- Always add new keys to the relevant Convict module with `doc`, `format`, `default`, `env`.
- Tag new keys with `level` and `group`.
- Avoid reading `process.env.*` directly in code — add a Convict key instead.
- After changes, run `npm run docs:config` and commit the updated `docs/config-reference.md`.

Starter templates
- `.env.basic`: minimal variables for one provider + one LLM.
- `.env.advanced`: commented power options for power users.

