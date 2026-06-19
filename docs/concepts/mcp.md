# MCP Tools — giving agents hands

> Personas give an agent a voice and [memory](memory.md) gives it continuity; **MCP**
> (Model Context Protocol) gives it *hands* — the ability to call external tools
> (look up an issue, query a database, hit an API) as part of a reply. This page is the
> conceptual map: how servers connect, how tools are discovered and run, and how
> [guards](guards.md) + human-in-the-loop approval keep that power safe.

Source of truth: `src/mcp/MCPService.ts`, `src/mcp/transportSelection.ts`,
`src/mcp/MCPGuard.ts`, `src/services/ToolManager.ts` (+ `PendingActionManager`,
`ApprovalRepository`). Setup how-to: [MCP Server Integration](../mcp/overview.md);
UI guides: [MCP Tools UI](../mcp-tools-ui-guide.md), [Tool Preferences](../mcp-tool-preferences.md).

---

## Servers, transports, tools

An **MCP server** is an external process or service that exposes tools. Open-Hivemind
connects to it, **discovers** its tools automatically, and lets bots invoke them. You can
connect to multiple servers at once; servers already listed in a bot's config auto-connect
at startup (admin-added servers connect on demand).

### Transport is chosen by URL scheme

`resolveMcpTransport()` (`src/mcp/transportSelection.ts`) is a pure function mapping the
server URL's scheme to an MCP SDK transport — no hardcoded server list:

| URL | Transport | Target |
|---|---|---|
| `stdio://<command>` | `StdioClientTransport` | local command to spawn |
| `http://` / `https://` | `StreamableHTTPClientTransport` | the URL as-is (modern remote transport) |
| `sse+http(s)://`, `sse://` | `SSEClientTransport` | rewritten to `http(s)://` (legacy SSE) |

> Streamable HTTP is the modern remote transport; SSE is the deprecated legacy one some
> servers still speak — hence the explicit `sse` scheme to opt into it.

---

## Running a tool — and the two safety gates

When a bot decides to call a tool, the request passes **two gates** before execution
(`src/services/ToolManager.ts`):

1. **Access control — who may use tools (`MCPGuard`).** The bot's guard profile sets an
   `mcpGuard`: `type: 'owner'` (only the channel/forum owner) or `type: 'custom'` (an
   `allowedUserIds` allowlist), or disabled (open). `MCPGuard` checks the requesting user
   against the forum owner / allowlist. This is the tool-access control surfaced in
   [Guards](guards.md).
2. **Human-in-the-loop approval — should *this* invocation run.** If a tool is marked
   sensitive, `ToolManager` routes the call through `PendingActionManager.create(botName,
   toolName, args, context)` and **waits for an admin to approve**. If it isn't approved,
   the call is denied with a message and never runs. Pending approvals are durable
   (`ApprovalRepository`), so a request survives a restart.

Only after both gates pass does the tool actually execute on its MCP server; the result
flows back into the bot's reply, and the invocation (tool, args, outcome) shows up in the
Activity feed like any other event.

> **Why two gates:** access control is *standing policy* (which users/bots may touch tools
> at all); HITL approval is *per-invocation* (a human signs off on this specific, risky
> call). A new tool can be enabled for one bot, owner-only, with approval required — then
> relaxed to auto-approve once it's proven safe.

---

## Managing MCP in the WebUI

- **MCP Servers** page — add/connect servers (stdio / HTTP / SSE), see discovered tools.
- **MCP Tools** page — inspect a tool's input schema and **test-run** it (Form or Raw-JSON
  mode) via the Run-Tool modal before any bot uses it, with execution history. See
  [MCP Tools UI Guide](../mcp-tools-ui-guide.md) and
  [MCP Tools Testing](../features/MCP_TOOLS_TESTING.md).
- **Tool preferences** — per-bot enable/disable and favorites
  ([Tool Preferences](../mcp-tool-preferences.md)).

> **Status (honest):** server connect (stdio/HTTP/SSE), tool discovery/execution,
> `MCPGuard` access control, and HITL approval are shipped. Some depth items (auto-connect
> coverage, non-stdio connect paths in every route) are partial — see
> [FEATURE_STATUS.md](../FEATURE_STATUS.md) (mcp-tools domain) and [ROADMAP.md](../../ROADMAP.md).

## See also

- [Guards](guards.md) — `mcpGuard` access control in the guard profile
- [How the Society Works](society-of-agents.md) · [Personas](personas.md) · [Memory](memory.md)
- [MCP Server Integration](../mcp/overview.md) — setup how-to
- [Tool-Usage Guards & Persistence](../tool-usage-guards-persistence.md) — approval/guard persistence
- [FEATURE_STATUS.md](../FEATURE_STATUS.md) · [ROADMAP.md](../../ROADMAP.md)
