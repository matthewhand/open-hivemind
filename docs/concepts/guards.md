# Guards — keeping the society safe

> An LLM wired into a live channel is a liability without limits. **Guard profiles** are
> the safety layer of the [society of agents](society-of-agents.md): reusable bundles of
> rate limits, content filters, tool-access control, and optional LLM-based guardrails
> that you assign to bots. This page is the map; each guard type has a deep-dive linked
> below.

Source of truth: `src/config/guardrailProfiles.ts` (profile shape + built-ins),
`src/message/handlers/inputProcessor.ts` / `outputProcessor.ts` (enforcement),
`/api/admin/guard-profiles` (CRUD), and the **Guards** admin page.

---

## A guard profile bundles four controls

```ts
GuardrailProfile {
  id; name; description;
  guards: {
    mcpGuard:            { enabled; type }                 // tool-access control
    rateLimit:           { enabled; maxRequests; windowMs } // volume cap
    contentFilter:       { enabled; strictness }            // low | medium | high
    semanticInputGuard:  { enabled; llmProviderKey; prompt; responseSchema }
    semanticOutputGuard: { enabled; llmProviderKey; prompt; responseSchema }
  }
}
```

| Control | What it does | Where it's enforced | Deep-dive |
|---|---|---|---|
| **Rate limit** | Caps per-bot message volume (`maxRequests` per `windowMs`) so a prompt loop can't flood a channel | input stage, state in `QuotaStore` | — |
| **Content filter** | Strictness level (`low`/`medium`/`high`) for what bots will repeat/engage with | input + output stages (`contentFilterService.checkContent`) | [Content Filtering](../features/content-filtering.md) |
| **Tool-access control** (`mcpGuard`) | Which MCP tools a bot may invoke, and whether invocations need human approval first | at MCP tool invocation (HITL approval) | [Tool-Usage Guards & Persistence](../tool-usage-guards-persistence.md) |
| **Semantic guardrails** | An LLM judges the inbound message and/or outbound reply against a custom prompt (returns allow/deny) | input (`semanticInputGuard`) + output (`semanticOutputGuard`) stages | [Semantic Guardrails](../features/semantic-guardrails.md) |

> **How it connects to the society:** rate limit + content filter shape *whether and what*
> a bot says, complementing the persona's [engagement decision](society-of-agents.md). The
> two are independent gates — a bot can want to reply (engagement) but be blocked or
> throttled (guards).

---

## Built-in profiles

Four profiles ship by default (visible on the Guards page, cloneable):

| Profile | Access control | Rate limit | Content filter | Semantic |
|---|---|---|---|---|
| **Open** | disabled | disabled | disabled (low) | off |
| **Owner Only** | owner-only tools | 50 / 60s | medium | off |
| **Strict Protection** | custom | 10 / 60s | high | off |
| **Semantic Protection** | owner | 30 / 60s | medium | LLM-based guardrails on |

Built-ins are read-only but cloneable; create your own with `/api/admin/guard-profiles`
or the Guards page. Profiles are **shared** — tightening a limit on a profile fixes every
bot assigned to it at once.

---

## How guards reach a bot

Guards apply per-bot: the bot's effective `contentFilter` / `rateLimit` / `mcpGuard` /
semantic-guard config is read in the message pipeline
(`inputProcessor.ts:171` content filter, `:225` semantic input guard; `outputProcessor.ts`
for the outbound reply). Assigning a guard **profile** to a bot is the convenient way to
set all four at once and keep them consistent across bots. Semantic guards additionally
need an `llmProviderKey` so the guardrail LLM can make its allow/deny call.

> **Persistence note.** Semantic-guard fields and tool-access settings persist through
> guard-profile CRUD (an earlier sanitizer dropped them on edit — fixed; see
> [ROADMAP.md](../../ROADMAP.md)). The MCP tool-access guard's persistence model is
> documented in [Tool-Usage Guards & Persistence](../tool-usage-guards-persistence.md).

---

## Managing guards in the WebUI

The **Guards** admin page lists profiles as cards showing each control's state
(Access Control / Rate Limit / Content Filter), with create / edit / clone / delete.
See the [User Guide](../USER_GUIDE.md) and [Guided Tour, step 4](../GUIDED_TOUR.md#4-guardrails-before-going-live)
for the operator walkthrough.

## See also

- [How the Society Works](society-of-agents.md) · [Personas](personas.md) — the other half of bot behavior
- [Content Filtering](../features/content-filtering.md) · [Semantic Guardrails](../features/semantic-guardrails.md) · [Tool-Usage Guards](../tool-usage-guards-persistence.md)
- [Input Validation](../security/input-validation.md) · [Security Hardening](../SECURITY_HARDENING.md)
- [ROADMAP.md](../../ROADMAP.md) — guard-related status
