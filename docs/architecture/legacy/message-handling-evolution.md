# Legacy: Monolithic Message Handler → 5-Stage Pipeline

> **Status:** superseded. The pipeline is the default path. The legacy handler still ships behind the
> `USE_LEGACY_HANDLER` feature flag (`src/message/handlers/messageHandler.ts`) as a fallback and
> reference. New work targets the pipeline.

## What it was

Originally, every inbound message from every platform funneled into a single function —
`handleMessage()` in `src/message/handlers/messageHandler.ts`. One function owned the entire
lifecycle: filtering bot/self messages, deciding whether to respond, fetching channel history and
memory, building the prompt, calling the LLM, post-processing, and sending the reply (plus typing
indicators, dedup, audit, and idle scheduling along the way).

```
inbound message ──▶ handleMessage()  ──▶ reply
                    └─ everything inline ─┘
```

## Why it existed

For a single bot on a single platform it was the simplest thing that worked: one place to read, one
place to change. Control flow was easy to follow top-to-bottom, and there were no stage boundaries to
coordinate.

## Why it changed

As the project grew toward **many bots across many platforms**, the monolith strained:

- **Untestable in isolation** — "should this bot respond?" couldn't be exercised without also running
  history fetch, LLM inference, and sending. Each concern was entangled with the next.
- **No place to observe decisions** — the response/skip choice (the heart of selective engagement)
  was a branch deep inside one function, with nowhere to attach tracing, metrics, or a pause point.
- **Hard to extend** — adding content filtering, semantic guardrails, MCP tool calls, or activity
  recording meant editing the one big function and risking everything else.
- **Cross-cutting features had no seams** — typing, dedup, audit, and idle handling were sprinkled
  inline rather than living at well-defined boundaries.

## What replaced it

A **5-stage pipeline** (`src/pipeline/createPipeline.ts`), where each stage is a small, independently
testable unit with explicit inputs and outputs:

```
Receive ─▶ Decision ─▶ Enrich ─▶ Inference ─▶ Send
   │           │           │          │          │
 normalize   should we   history +  call the   post-process
 inbound     respond?    memory +   LLM         + deliver
 message     (relevance, context              + typing/dedup
             crowding,
             mentions)
```

| Stage | File | Responsibility |
|---|---|---|
| Receive | `src/pipeline/ReceiveStage.ts` | Normalize the platform message into the internal shape; drop bot/self/ignored. |
| Decision | `src/pipeline/DecisionStage.ts` | Selective engagement — relevance, direct address, momentum, crowding; records the decision. |
| Enrich | `src/pipeline/EnrichStage.ts` | Gather channel history and memory; assemble context. |
| Inference | `src/pipeline/InferenceStage.ts` | Call the LLM (function/tool calling, streaming where supported). |
| Send | `src/pipeline/SendStage.ts` | Post-process, deliver, handle typing/dedup, record activity. |

The win isn't just tidiness: each stage is a natural attachment point for the things the monolith had
nowhere to put — **decision tracing**, **per-stage metrics**, a **pipeline debugger pause point**, and
**activity recording** that feeds the WebUI's live feed.

## What still remains

- `USE_LEGACY_HANDLER=true` reverts to `handleMessage()`. It is kept as a fallback and a reference
  implementation, **not** the supported path — the pipeline is the default and where features land.
- Some helpers are shared between the two paths; over time the legacy-only code is expected to be
  retired once the pipeline reaches full parity (a few cross-cutting stages — content filtering,
  semantic guardrail, command handling — are tracked toward parity in [ROADMAP.md](../../../ROADMAP.md)).

## See also

- Current design: [Architecture Overview](../overview.md), [Layered Overview](../layered-overview.md)
- Forward plan / parity gaps: [ROADMAP.md](../../../ROADMAP.md)
- Per-feature audit: [FEATURE_STATUS.md](../../FEATURE_STATUS.md)
