# Concepts — how the society of agents works

These pages explain the **ideas** behind Open-Hivemind — what an agent *is*, how it
decides to speak, what powers it, and how it's kept safe — each grounded in the actual
code (with file anchors) and linking the deeper how-to guides rather than repeating them.

Start with the [Vision](../VISION.md) for the north-star, then read these in order:

1. **[How the Society Works](society-of-agents.md)** — the core idea: agents that *choose*
   whether to speak (probability roll vs threshold), avoid pile-ons (density penalties),
   stay engaged (momentum), and coordinate across bots (5 swarm modes). The engine the
   rest builds on.
2. **[Personas](personas.md)** — the identity layer: how a persona sets an agent's *voice*
   (system prompt) and *social temperament* (`responseBehavior`).
3. **[LLM Providers](llm-providers.md)** — the reasoning engine: pluggable backends
   (OpenAI/Flowise/OpenWebUI/Letta/OpenSwarm), the provider contract, tool-calling and
   streaming, and per-bot model profiles.
4. **[Memory](memory.md)** — continuity: pluggable backends (MemVault/Mem0/Mem4AI/Postgres),
   the provider contract, how memory is read into the prompt and written back, and
   retention/eviction.
5. **[MCP Tools](mcp.md)** — giving agents hands: server transports (stdio/HTTP/SSE), tool
   discovery/execution, and the two safety gates (access control + human-in-the-loop
   approval).
6. **[Guards](guards.md)** — the safety layer: rate limits, content filters, tool-access
   control, and semantic guardrails, and where each is enforced in the pipeline.

## Where to go next

- [Vision & Status](../VISION.md) — the north-star + honest built/partial/remaining
- [Architecture Overview](../architecture/overview.md) — how it's built
- [Data Directories](../reference/data-directories.md) — where runtime files live
- [ROADMAP.md](../../ROADMAP.md) · [FEATURE_STATUS.md](../FEATURE_STATUS.md) — the code-audited status
