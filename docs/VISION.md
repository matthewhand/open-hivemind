# Open-Hivemind — Vision & Status

> **What this document is.** The north-star for Open-Hivemind, followed by an
> honest, code-grounded account of what is *already built*, what is *partial*,
> and what *remains*. For the row-by-row audit behind the status claims here,
> see [ROADMAP.md](../ROADMAP.md) and [FEATURE_STATUS.md](FEATURE_STATUS.md).
> For where we came from, see [Legacy & superseded architectures](legacy/README.md).

---

## The Vision — a society of agents

Most "AI bot" tools give you **one assistant that waits to be asked**. Open-Hivemind
is built around a different idea:

> **A channel should feel like a room full of distinct minds — some human, some not —
> that listen, choose when to speak, and behave like members of a community rather
> than command-line prompts with avatars.**

You don't deploy *a bot*. You populate a space with **many personas**, each with its
own voice, memory, directives, and social instincts, and let them coexist with your
people across Discord, Slack, Mattermost, and Telegram **at the same time**.

The design goal is *presence*, not *responsiveness*. A good Open-Hivemind agent is one
you sometimes forget is a bot.

### The five social instincts

These are the behaviours that turn "a pile of chatbots in a channel" into a society.
Each is a real mechanism in the codebase today (anchors below), not a slogan — and the
full mechanics (rolls, penalties, swarm modes, tuning knobs) are documented in
**[How the Society Works](concepts/society-of-agents.md)**:

1. **Agency — they choose whether to speak.** Every inbound message runs through a
   decision that rolls a probability against a per-bot threshold. Silence is a valid,
   common outcome. *(`src/message/helpers/processing/shouldReplyToMessage.ts`,
   `src/pipeline/DecisionStage.ts`)*
2. **Attention — direct address pulls them in.** Mentions, replies, DMs, name-drops,
   and configurable wakewords bypass the unsolicited gate and add a bonus to the roll,
   so talking *to* a bot reliably gets a response. *(`shouldReplyToMessage.ts` wakeword/
   mention handling)*
3. **Social anxiety — they avoid pile-ons.** Channel density and participation are
   tracked; the busier and faster a conversation, the less likely an unsolicited bot is
   to jump in. *(`IncomingMessageDensity.ts`, `GlobalActivityTracker.ts`,
   `unsolicitedMessageHandler.ts`)*
4. **Momentum — once engaged, they stay engaged.** Idle/turn tracking keeps a bot in a
   conversation it has joined without constant re-prompting.
   *(`IdleResponseManager.ts`)*
5. **Coordination — many bots, one room, no chaos.** When several bots could answer the
   same message, a swarm coordinator arbitrates across five modes —
   **exclusive** (first to claim wins), **broadcast** (each decides independently),
   **rotating** (round-robin turns), **priority** (ranked), and **collaborative**
   (combine into one reply). *(`src/services/SwarmCoordinator.ts`)*

Every decision is **observable and auditable** — rolls, thresholds, and reasons are
persisted to a `decisions` table and surfaced in the live activity feed, so the
"why did it / didn't it respond" is never a black box.
*(`src/database/repositories/DecisionRepository.ts`)*

---

## Where we are today (honest)

Open-Hivemind is **well past prototype**. The platform core is shipped and verified by a
per-feature code audit: roughly **232 features complete, ~44 partial, ~20 stubs, 0
known-broken** as of the last audit ([ROADMAP.md](../ROADMAP.md)).

### The society itself is real

The five social instincts above are **implemented and running**, not mocked:

- Probabilistic selective engagement with threshold, bonuses, and density penalties.
- Wakeword / mention / reply / DM / name direct-address handling.
- Crowd-control throttling from live channel density.
- Five-mode multi-bot swarm arbitration (the same modes exposed in the
  **Response Profiles** admin page).
- Decisions persisted and replayed in the activity feed.

This is the heart of the vision, and it works.

### The platform around it is real

- **Multi-agent, multi-platform messaging.** Full two-way (receive + send), threads,
  typing, and reconnection for **Discord, Slack, and Mattermost**; **Telegram**
  bootstrapped with long-poll receive; inbound webhook ingress. Many bots run under one
  process, each with its own identity.
- **Pluggable LLMs.** OpenAI, Flowise, OpenWebUI, Letta, OpenSwarm — with tool/function
  calling; live model listing and response streaming for OpenAI.
- **Memory.** Pluggable backends (Mem0, Mem4AI, MemVault, PostgreSQL) with
  retention/eviction, wired per-bot into the pipeline.
- **Tools.** MCP server integration with tool execution, human-in-the-loop approval, and
  per-bot tool guards.
- **Safety & operations.** Guard profiles (rate limit / content filter / tool-access),
  TOTP 2FA, account lockout, session management, durable audit logging.
- **A real admin surface.** A 35+ page WebUI to configure bots, personas, LLMs, memory,
  guards, and MCP — no code required — with JSON/YAML/CSV import/export.
- **Observability.** Live activity feed, health checks, Prometheus-compatible metrics,
  and trace export (console/file/OTLP).

### Be clear about what is *not* finished

In the spirit of an honest assessment, these are simulated, partial, or off-by-default
today (full list in [ROADMAP.md](../ROADMAP.md)):

- **Some monitoring/analytics surfaces still infer or simulate.** Per-step pipeline
  telemetry for Message-Flow Replay is inferred; several BusinessKPI metrics
  (cost/retention/churn/availability) are not yet fed by real data.
- **Channel routing depth.** Cross-channel "pick the best place to speak" is Discord-led
  and off by default; Slack/Mattermost routing is partial.
- **LLM depth gaps.** Streaming is OpenAI-only; OpenWebUI per-bot RAG/knowledge upload is
  startup-file-only.
- **Platform edges.** Discord slash-command dispatch and voice STT are stubs; Mattermost
  typing uses a REST best-effort call; Telegram is receive-capable but newer than the
  three primary platforms.
- **A few security/persistence hardening items** (audit middleware coverage, some durable
  allow-lists) are in progress.

---

## What remains — closing the gap to the full vision

Framed against the society north-star, the meaningful work ahead is **depth, not
foundation**:

1. **Richer social awareness.** Cross-bot awareness today is arbitration
   (who speaks); the next step is *reaction* — bots that visibly defer to, build on, or
   react to *each other*, and tune their own talkativeness from observed room mood.
2. **Truthful observability end-to-end.** Replace the remaining inferred/simulated
   monitoring with real per-step telemetry so an operator can watch the society think.
3. **Platform parity.** Bring Telegram and channel-routing up to Discord/Slack/Mattermost
   depth so the society behaves identically everywhere.
4. **LLM/memory depth.** Streaming and per-bot knowledge across all providers; deeper
   conversation summarization so long-lived agents remember like members, not sessions.
5. **Portable, capability-routed agents.** Let a persona declare *what kind of mind it
   needs* (intelligence/speed/cost) and resolve that to whatever models are available —
   so a society is portable across stacks. *(proposed — see
   [CAPABILITY_ROUTING.md](CAPABILITY_ROUTING.md))*

The detailed, code-audited checklist of every item lives in
[ROADMAP.md](../ROADMAP.md) (Now / Next / Later).

---

## Supporting pillars

The society is the point; these make it practical and are already in place:

- **Operator platform** — one dashboard to run many bots across many platforms with
  guards, RBAC, 2FA, audit, and metrics.
- **Provider-agnostic core** — Discord, OpenAI, Letta, etc. live in independent
  `packages/*` discovered at runtime; the core hardcodes **no** provider list, and the
  WebUI renders provider forms from what the backend reports.
  *(see [Provider & Adapter Package Architecture](architecture/provider-package-architecture.md))*
- **Self-hostable & open** — run your own stack, own your data, MIT-licensed, with a
  community-package path.

---

## Legacy & superseded architectures

Open-Hivemind got here by shedding earlier designs — a coupled monolith became runtime
plugin packages, two parallel auth middlewares and dashboards were consolidated, a legacy
persona store was retired, and the bots and WebUI were unified into a single process. That
history (and *why* each design was replaced) is preserved in
**[docs/legacy/README.md](legacy/README.md)** so the current shape is understood as a
destination, not an accident.

---

## Map of the documentation

| You want… | Read |
|---|---|
| The honest, row-by-row status | [ROADMAP.md](../ROADMAP.md) · [FEATURE_STATUS.md](FEATURE_STATUS.md) |
| How the society *actually* decides who speaks | [How the Society Works](concepts/society-of-agents.md) |
| How an agent's identity is defined | [Personas](concepts/personas.md) |
| How bots are kept safe | [Guards](concepts/guards.md) |
| How agents remember | [Memory](concepts/memory.md) |
| How agents use external tools | [MCP Tools](concepts/mcp.md) |
| What powers an agent's reasoning | [LLM Providers](concepts/llm-providers.md) |
| How it's built | [Architecture Overview](architecture/overview.md) · [Unified Server](architecture/unified-server.md) · [Provider Packages](architecture/provider-package-architecture.md) |
| How to run it | [Setup](getting-started/setup-guide.md) · [User Guide](USER_GUIDE.md) · [Deployment](operations/deployment.md) |
| Where we came from | [Legacy & superseded architectures](legacy/README.md) |
| A proposed future direction | [Capability-Based Model Routing](CAPABILITY_ROUTING.md) |
