# Vision

> **One line:** Open-Hivemind turns a chat channel into a *community of AI personas* — many distinct agents, each with its own voice, memory, and judgment about when to speak — managed from one dashboard and portable across Discord, Slack, and Mattermost.

This document is the front door to *why* the project exists and *where it honestly stands*. For the
per-feature audit see [FEATURE_STATUS.md](FEATURE_STATUS.md); for the forward plan see
[ROADMAP.md](../ROADMAP.md); for how the architecture has evolved see
[architecture/legacy/](architecture/legacy/README.md).

---

## The thesis

Most chatbot frameworks assume **one bot, one platform, one request → one reply**. Open-Hivemind
rejects that framing. The interesting unit isn't a bot — it's a *hivemind*: a set of agents that
coexist with humans in the same channels and behave less like a command line and more like
participants in a conversation.

Three commitments follow from that:

1. **Personas are first-class, not prompts buried in code.** An identity — its system prompt,
   traits, and behavior — is a reusable object you assign to bots. The same Discord token can speak
   as different characters in different channels; the same persona can span platforms.

2. **Agents exercise judgment about *whether* to speak.** A bot listens to the room and decides to
   respond based on relevance, direct address, conversational momentum, and how crowded the channel
   already is ("social anxiety" so a dozen bots don't pile on). Silence is a feature.

3. **Operators stay in control without writing code.** Everything — providers, personas, guardrails,
   memory, tools — is configurable from a WebUI or reproducible from environment variables, with
   audit logging, human-in-the-loop tool approval, and honest observability over what the swarm does.

## What we are building toward

- **A coordination layer for many agents in shared human spaces** — not a single assistant, but an
  ecosystem where engagement, hand-off, and restraint are tunable per persona and per channel.
- **Provider independence.** Messaging platforms, LLM backends, memory stores, and tools are all
  behind interfaces so you are never locked to one vendor. Bring OpenAI or a local OpenAI-compatible
  endpoint; bring Discord or Mattermost; swap memory backends without touching bot logic.
- **Safety you can see.** Guardrails (rate limits, content filtering, tool-access control), 2FA and
  account lockout, durable audit logs, and a message pipeline whose decisions are inspectable —
  because agents acting autonomously in real communities must be accountable.
- **Honesty as a product value.** The documentation says what is built, what is partial, and what is
  aspirational — and the audit that backs those claims is public and re-verified against the code.

## What's true today (honest status)

The numbers below come from [FEATURE_STATUS.md](FEATURE_STATUS.md), a row-by-row audit of **307
features across 10 domains**, re-verified against `main` (not aspirations):

| | Count | Meaning |
|---|---|---|
| ✅ Complete | **218** | Implemented and wired into a real path |
| 🟡 Partial | **64** | Works, with documented gaps |
| 🔲 Stub | **20** | Scaffolding present, not functional |
| 📋 Planned | **5** | Designed, not started |
| ❌ Broken | **0** | — |

**Shipped and verified:** multi-bot Discord / Slack / Mattermost (two-way messaging, threads, typing
indicators); OpenAI, Flowise, Letta, OpenSwarm, and OpenWebUI LLM providers; the 5-stage message
pipeline; the persona system; guard profiles; MCP tool execution with human-in-the-loop approval;
SQLite/Postgres persistence; a WebUI admin with 35+ pages; TOTP 2FA, account lockout, session
management, and audit logging.

**Honestly partial or not yet there** (see [ROADMAP.md](../ROADMAP.md) for the itemized list):
outbound webhook delivery, Telegram receive, some monitoring wire-ups (threshold alerting), Discord
voice / speech-to-text, vision/image input, and assorted per-provider edges. Where a screen would
otherwise show fabricated data, we prefer an honest empty state.

> If you find a claim in the docs that the code doesn't back up, that's a bug — please open an issue.
> Keeping [FEATURE_STATUS.md](FEATURE_STATUS.md) truthful is part of the project's definition of done.

## Design principles

- **Interfaces over implementations** — every platform, provider, memory store, and tool sits behind
  a contract; concrete adapters are swappable packages.
- **Configuration as data** — bots are declared (WebUI or `BOTS_<NAME>_*` env vars) and round-trip
  through JSON/YAML/CSV export, so a deployment is reproducible.
- **Observable by default** — activity feed, health checks, Prometheus-compatible metrics, and trace
  export make the swarm's behavior legible.
- **Fail honest** — a missing capability shows a clear empty state or a 501, never a fabricated chart.

## Where to go next

- New here? Start with the [README](../README.md) quick start, then the [User Guide](USER_GUIDE.md).
- Want the architecture? See the [Architecture Overview](architecture/overview.md).
- Curious how we got here? The [Legacy Architecture](architecture/legacy/README.md) section preserves
  earlier designs (the monolithic message handler, the legacy persona store) and why they changed.
- Want to help? [CONTRIBUTING.md](../CONTRIBUTING.md) and the [ROADMAP](../ROADMAP.md) list concrete
  next steps.
