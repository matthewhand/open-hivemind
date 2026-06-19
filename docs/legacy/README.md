# Legacy & Superseded Architectures

> **Why this exists.** Open-Hivemind's current shape is a *destination*, reached by
> deliberately replacing earlier designs. This page records what those designs were and
> **why** each was retired, so the present architecture is legible to newcomers and so we
> don't re-introduce problems we already solved. Nothing here describes how the system
> works *today* — for that, start at [Architecture Overview](../architecture/overview.md)
> and the [Vision & Status](../VISION.md).

Each entry: **Then → Now → Why**.

---

## 1. Coupled provider monolith → runtime plugin packages

**Then.** Discord, Slack, the LLM clients, and memory logic lived inside `src/`, imported
directly. Adding or testing a provider meant touching the core; the WebUI carried
hardcoded lists of known provider names and bespoke config forms for each.

**Now.** Every provider and adapter is an independent workspace package under
`packages/*` (`message-discord`, `llm-openai`, `memory-mem0`, `tool-mcp`, …). The core
knows only the `ILlmProvider` / `IAdapterFactory` interfaces and discovers
implementations at runtime via `require.resolve` probes; the WebUI renders each
provider's config form from fields the backend reports.
See [Provider & Adapter Package Architecture](../architecture/provider-package-architecture.md).

**Why.** Zero hardcoded provider lists, independent testing/versioning per provider, and a
WebUI that can't drift out of sync with what's actually installed. This is the "decoupled
mode" referenced in older code comments.

---

## 2. Separate bot and WebUI processes → unified single process

**Then.** Running the system meant standing up the messenger services and the web
dashboard as separate concerns.

**Now.** One process serves bot services, the REST API, the WebSocket activity stream,
the webhook ingress, and the built React WebUI together
([Unified Server](../architecture/unified-server.md)). `SKIP_MESSENGERS=true` runs the
WebUI alone for admin-only or test scenarios.

**Why.** One thing to deploy, one config surface, and a WebSocket bus that sees the same
in-process events the bots emit — no cross-process plumbing for live monitoring.

---

## 3. Two parallel auth middlewares → one

**Then.** Two separate authentication middleware implementations existed in parallel,
with subtly different behaviour depending on which routers used which.

**Now.** A single consolidated middleware at `src/auth/middleware.ts` (PR #3029).

**Why.** Parallel auth paths are a security liability — divergent token handling and
coverage gaps. Consolidation made the security posture auditable in one place.

---

## 4. Duplicate dashboards & interface copies → `@hivemind/shared-types`

**Then.** Core interfaces were duplicated across the codebase, and more than one dashboard
implementation had grown up side by side.

**Now.** Core contracts are consolidated into the `@hivemind/shared-types` package and the
dashboards were de-duplicated (PR #3010).

**Why.** A single source of truth for shared types prevents the silent drift that
duplicated interface definitions cause across a monorepo.

---

## 5. Legacy persona store → `PersonaManager`

**Then.** Personas were served from a legacy `/api/agents/personas` store that lived
alongside the newer persona system.

**Now.** `PersonaManager` is canonical and `/api/personas` is the single endpoint; the
legacy store was removed.

**Why.** Two stores for the same concept meant edits could land in the wrong place and
reads could disagree. One canonical store, one endpoint.

---

## 6. Bespoke migrations → `DatabaseManager` + numbered migrations

**Then.** A large hand-rolled `MigrationManager` (~754 lines) and ad-hoc schema logic.

**Now.** `DatabaseManager` supports both SQLite and PostgreSQL with transactions and a
numbered migration series (`000_initial_schema`, `001…`), plus connection-time PRAGMA
tuning and indexes for hot read paths. The dead `MigrationManager` was deleted.

**Why.** A portable, transactional, versioned schema path that works the same on SQLite
(local) and Postgres (scaled), without a bespoke migration engine to maintain.

---

## 7. Removed / retired surfaces

Smaller pieces that were deleted rather than redesigned, kept here so their absence is
intentional and documented:

- **Voice module** — the original Discord voice sources were removed; the remaining
  `voiceChannelManager` / `speechToText` are explicit no-op stubs. Voice is *not* a
  current capability.
- **Fabricated marketplace sample** — a fake `hivemind-plugin-weather` entry that leaked
  into real provider pages was removed.
- **Fabricated Provider Health SLOs** — a page of invented availability numbers was gated
  pending real data.
- **Orphaned components and dead config-migration logic** — removed during the cleanup
  campaign (e.g. orphan `Settings.tsx`, commented-out `ConfigMigrator` future logic).

---

## How to read the rest of the history

This page is a curated narrative, not an exhaustive changelog. For the full record:

- [CHANGELOG.md](../../CHANGELOG.md) — release-by-release changes.
- `git log` — the consolidation PRs referenced above (#3010, #3029, and the ~50-PR
  hardening campaign noted in [FEATURE_STATUS.md](../FEATURE_STATUS.md)).
- [ROADMAP.md](../../ROADMAP.md) — what is shipped, partial, and planned *now*.
