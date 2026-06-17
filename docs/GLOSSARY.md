# Glossary

Core Open-Hivemind terms, defined as the **code** uses them (not aspirationally). Where a term maps
to a concrete module or contract, that's noted so you can read the source of truth.

- **Hivemind** — the collective of multiple bot agents running together and coexisting with humans in
  shared channels. The project's unit of interest is the *hivemind*, not a single chatbot. See
  [VISION.md](VISION.md).

- **Bot (agent / instance)** — one configured unit = a persona + a message provider + an LLM provider,
  identified by a `botId`/name. Many bots can run under one process and share a channel; the
  `IMessengerService` contract exposes per-bot delegation via `getDelegatedServices`.

- **Persona** — a reusable identity (system prompt + behavior traits) assignable to one or more bots.
  Managed by `PersonaManager`; the canonical API is `/api/personas`, persisted to
  `config/user/custom-personas.json`. Built-in personas are read-only but clonable. The same bot token
  can speak as different personas in different channels.

- **Selective engagement** — the logic that decides *whether* a bot responds at all, based on
  relevance, direct address, conversational momentum, and how crowded the channel is ("social
  anxiety", to avoid pile-ons). It lives in the pipeline's **Decision** stage.

- **Pipeline stage** — one step of the default 5-stage message pipeline
  (`src/pipeline/createPipeline.ts`): **Receive** (normalize inbound) → **Decision** (selective
  engagement) → **Enrich** (history + memory) → **Inference** (LLM call) → **Send** (post-process +
  deliver). The legacy monolithic handler is still available behind `USE_LEGACY_HANDLER` — see
  [Legacy Architecture](architecture/legacy/message-handling-evolution.md).

- **Guard profile** — a safety bundle applied to a bot: rate limiting, a content filter
  (`ContentFilterConfig`), and tool-access control (an MCP guard profile, `mcpGuardProfile`). Surfaced
  in the WebUI under **Guards**.

- **Swarm mode** — how several bots coordinate who replies in one channel. The implemented modes
  (`SwarmCoordinator`, `SwarmMode`) are: `exclusive`, `broadcast`, `rotating`, `priority`, and
  `collaborative`. (Note: the WebUI/Response-Profiles UI currently highlights a subset; the full set
  lives in code.)

- **MCP (Model Context Protocol)** — the protocol for connecting external **tool servers**.
  Open-Hivemind runs an MCP client, discovers a server's tools, and can execute them from the message
  pipeline. See the [MCP overview](mcp/overview.md).

- **HITL (human-in-the-loop)** — tools marked **sensitive** require administrator approval before they
  execute (`ToolManager`); the request lands in an approval queue rather than running automatically.

- **Provider** — a swappable adapter behind an interface. **Message providers** (Discord, Slack,
  Mattermost; Telegram send-only) implement `IMessengerService`; **LLM providers** (OpenAI, Flowise,
  OpenWebUI, Letta, OpenSwarm) implement the LLM contract; **memory providers** (Mem0, Mem4AI,
  MemVault, PostgreSQL) back conversation memory.

See also: [VISION.md](VISION.md) · [Architecture Overview](architecture/overview.md) ·
[FEATURE_STATUS.md](FEATURE_STATUS.md) (what's built vs. partial).
