# Legacy Architecture

This section preserves **earlier designs** of Open-Hivemind — how parts of the system used to look,
why they were built that way, and what replaced them. It exists for two reasons:

1. **Context for current code.** Several seams still carry the shape of an older design (e.g. the
   legacy message handler still ships behind a flag). Knowing the history explains why.
2. **Honest record.** We don't pretend the current architecture sprang fully formed. Documenting the
   path — including dead ends — is part of the project's [honesty commitment](../../VISION.md).

> These documents describe **superseded** designs. For the architecture as it stands today, see the
> [Architecture Overview](../overview.md), [Layered Overview](../layered-overview.md), and
> [Unified Server](../unified-server.md).

## Index

| Topic | Then → Now | Status of the old design |
|---|---|---|
| [Message handling](message-handling-evolution.md) | Monolithic `handleMessage()` → 5-stage pipeline (Receive · Decision · Enrich · Inference · Send) | Legacy handler still present behind `USE_LEGACY_HANDLER`; pipeline is the default |
| _Persona storage_ (planned write-up) | Legacy `/api/agents/personas` store → `PersonaManager` (`/api/personas`) | Legacy store removed; canonical path is `/api/personas` |

_More legacy write-ups are added here as older subsystems are documented. If you remember a design
that predates these docs, a PR adding it (with the "why it changed") is welcome._

## How to read these

Each legacy document follows the same shape:

- **What it was** — the old design, in enough detail to recognize it in git history.
- **Why it existed** — the constraints that made it reasonable at the time.
- **Why it changed** — the pressure that made it untenable.
- **What replaced it** — a pointer to the current design.
- **What still remains** — any compatibility shims or flags that keep the old path reachable.
