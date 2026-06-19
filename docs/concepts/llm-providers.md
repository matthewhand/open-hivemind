# LLM Providers — the agent's reasoning

> A [persona](personas.md) gives an agent its voice and [memory](memory.md) its
> continuity, but the **LLM provider** is the *brain* that actually composes a reply.
> Open-Hivemind is provider-agnostic: each backend is an independent package behind one
> interface, so a bot's reasoning engine is a config choice — and different bots in the
> same [society](society-of-agents.md) can run on different models.

Source of truth: `packages/shared-types/src/ILlmProvider.ts` (contract),
`packages/llm-*` (backends), `src/config/botConfigFactory.ts` (per-bot binding),
`src/message/handlers/inferenceProcessor.ts` (where it's called).

---

## Pluggable backends

Five providers ship, each an independent `llm-<provider>` package discovered at runtime —
the core hardcodes **no** provider list (same pattern as [memory](memory.md) and
messaging; see [Provider Package Architecture](../architecture/provider-package-architecture.md)):

| Provider | Package | Notes |
|---|---|---|
| **OpenAI** (and OpenAI-compatible) | `llm-openai` | Any OpenAI-compatible endpoint via base-URL (Ollama, vLLM, LM Studio). The most capable backend here — see the capability matrix below. |
| **Flowise** | `llm-flowise` | Flowise chatflows. |
| **OpenWebUI** | `llm-openwebui` | OpenWebUI models; per-bot knowledge files (partial). |
| **Letta** | `llm-letta` | Letta (MemGPT) agents. |
| **OpenSwarm** | `llm-openswarm` | OpenSwarm multi-agent. |

### The provider contract

```ts
interface ILlmProvider {
  supportsChatCompletion(): boolean
  supportsCompletion(): boolean
  generateChatCompletion(userMessage, history, metadata): Promise<string>     // all providers
  generateCompletion(prompt): Promise<string>                                 // single-turn text
  generateStreamingChatCompletion?(...)            // OPTIONAL — OpenAI only today
  generateChatCompletionWithTools?(messages, tools: LlmToolDefinition[], ...) // OPTIONAL — function/tool calling
}
```

### Capability matrix (honest)

| Capability | OpenAI | Flowise | OpenWebUI | Letta | OpenSwarm |
|---|:--:|:--:|:--:|:--:|:--:|
| Chat completion | ✅ | ✅ | ✅ | ✅ | ✅ |
| Tool / function calling | ✅ | partial | partial | partial | partial |
| Response **streaming** | ✅ | — | — | — | — |
| Live model listing | ✅ | varies | varies | varies | varies |

> **Honest note:** `generateStreamingChatCompletion` is implemented **only** by `llm-openai`
> today; the others return complete responses. Tool-calling depth and OpenWebUI per-bot
> knowledge/RAG are partial — see [FEATURE_STATUS.md](../FEATURE_STATUS.md) (llm-providers)
> and [ROADMAP.md](../../ROADMAP.md).

---

## How a bot picks its brain

A bot config sets two things (`src/config/botConfigFactory.ts`):

- **`LLM_PROVIDER`** — `openai` | `flowise` | `openwebui` | `letta` | `openswarm`.
- **`LLM_PROFILE`** — a reusable connection template (endpoint, key, default model).

Profiles are shared templates: two bots can share one OpenAI profile, or one bot can run a
cheap model while another runs a stronger one — a per-bot choice at creation time. Manage
them on the **LLM Providers** admin page; live model lists are fetched where the provider
supports it ([Dynamic Model Fetching](../configuration/dynamic-model-fetching.md),
[LLM Models API](../api/llm-models-endpoint.md)).

---

## Where the LLM runs in the pipeline

The provider is invoked in the **Inference stage** (`inferenceProcessor.ts`): the stage
builds the final system prompt (persona prompt + [retrieved memory](memory.md)) and calls
`generateChatCompletion(...)` (or the streaming/tool-aware variant). If the persona's tools
are enabled and the provider supports it, `generateChatCompletionWithTools` runs the
[MCP tool](mcp.md) loop — each tool call passes the [guard + HITL gates](guards.md) before
executing. The resulting text becomes the bot's reply.

---

## Toward portable brains

Today a bot names a specific provider + profile. The **proposed**
[Capability-Based Routing](../CAPABILITY_ROUTING.md) direction lets a persona instead
declare *what kind of mind it needs* (intelligence / speed / cost) and have a resolver map
that to whatever models are available — making a whole society portable across stacks.

## See also

- [How the Society Works](society-of-agents.md) · [Personas](personas.md) · [Memory](memory.md) · [MCP Tools](mcp.md)
- [Provider Package Architecture](../architecture/provider-package-architecture.md) — runtime discovery
- [Dynamic Model Fetching](../configuration/dynamic-model-fetching.md) · [LLM Models API](../api/llm-models-endpoint.md) · [Provider Cheatsheet](../configuration/provider-cheatsheet.md)
- [Flowise Setup](../configuration/flowise-setup.md) · [OpenWebUI Setup](../configuration/openwebui-setup.md)
- [Capability-Based Routing](../CAPABILITY_ROUTING.md) *(proposed)* · [FEATURE_STATUS.md](../FEATURE_STATUS.md) · [ROADMAP.md](../../ROADMAP.md)
