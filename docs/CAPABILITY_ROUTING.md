# Capability-Based Model Routing

> **Status**: Proposed (design doc — no code yet)
> **Last Updated**: 2026-06-17
> **Purpose**: Decouple portable agent *blueprints* from concrete inference. A blueprint declares *what it wants* from a model on a 0–1 scale (intelligence / speed / cost) plus hard capability requirements; a per-deployment resolver maps those wants onto the best available model in the local registry.

---

## Table of Contents

1. [Motivation](#motivation)
2. [What already exists](#what-already-exists)
3. [The cut: blueprint vs registry](#the-cut-blueprint-vs-registry)
4. [Schema](#schema)
5. [Resolver semantics (weighted priorities)](#resolver-semantics-weighted-priorities)
6. [Pitfalls baked into the design](#pitfalls-baked-into-the-design)
7. [Resolution timing & overrides](#resolution-timing--overrides)
8. [Migration plan](#migration-plan)
9. [Relationship to the Letta / LiteLLM stack](#relationship-to-the-letta--litellm-stack)
10. [Open questions](#open-questions)
11. [Implementation checklist](#implementation-checklist)

---

## Motivation

Today a bot definition welds its *portable identity* to its *environment-specific inference*. From [`config/bots/devopsbot.json`](../config/bots/devopsbot.json):

```json
{
  "name": "DevOpsBot",
  "persona": "technical-support",
  "systemInstruction": "You are a DevOps assistant...",
  "llmProvider": "openai",
  "openai": { "apiKey": "demo-key", "model": "gpt-4o-mini" }
}
```

The persona + instruction (portable, shareable) are inseparable from `llmProvider` + `model` + `apiKey` (secret, environment-specific). Consequences:

- A blueprint can't be shared without leaking/needing vendor wiring.
- Moving from a cloud deployment (Opus available) to a laptop (only Ollama) means hand-editing every bot.
- There's no way to express *intent* ("this agent needs to be smart" vs "this one just needs to be fast and cheap") — only a hardcoded model id.

**Goal:** a blueprint says *what it wants*; the deployment decides *what it gets*.

## What already exists

We are extending, not greenfielding. The plumbing is ~80% present:

- **Profile registry** — [`src/config/llmProfiles.ts`](../src/config/llmProfiles.ts) defines `ProviderProfile { key, name, description, provider, modelType, config }`, persisted in `llm-profiles.json`. This is already a per-deployment list of available inference, separate from bots. **This is the registry we map onto.**
- **Provider instances** — [`src/config/ProviderConfigManager.ts`](../src/config/ProviderConfigManager.ts) (`ProviderInstance { id, name, type, config }`).
- **Task router** — [`src/llm/taskLlmRouter.ts`](../src/llm/taskLlmRouter.ts) already routes *by task* (`semantic | summary | followup | idle`) to a provider+model via explicit references. It establishes the precedent that model selection is indirect.
- **Bot resolution point** — [`src/llm/getLlmProvider.ts`](../src/llm/getLlmProvider.ts) `getLlmProviderForBot(...)` is where a bot's `llmProvider` becomes a concrete provider instance. **This is where the resolver plugs in.**
- **Metrics** — [`src/monitoring/MetricsCollector.ts`](../src/monitoring/MetricsCollector.ts) already counts tokens/usage — the basis for *measured* speed/cost later (see pitfalls).

The missing piece is small: a **capability vector** on each profile + a **requirements block** on each blueprint + a **scorer**.

## The cut: blueprint vs registry

| | Lives in | Portable? | Contains |
|---|---|---|---|
| **Blueprint** | `config/bots/*.json` | ✅ yes — shareable | persona, instruction, `messageProvider`, `model.requires`, `model.prefers` |
| **Registry** | `llm-profiles.json` | ❌ no — per-deployment | concrete model id, endpoint, key ref, **capabilities vector**, tags, context window |

The blueprint names **no vendor, no model, no key**.

## Schema

### Blueprint — `model` block (replaces `llmProvider` + provider config)

```json
{
  "name": "DevOpsBot",
  "messageProvider": "slack",
  "persona": "technical-support",
  "systemInstruction": "...",
  "model": {
    "requires": ["tools"],          // HARD gates — categorical capabilities
    "minContext": 16000,            // HARD gate — minimum context window
    "prefers": {                    // SOFT — 0..1 priorities (weights)
      "intelligence": 0.8,
      "speed": 0.5,
      "cost": 0.3
    }
  }
}
```

### Registry — `ProviderProfile` gains `capabilities`, `tags`, `contextWindow`

```json
{
  "key": "opus",
  "name": "Claude Opus 4.8",
  "provider": "openai",
  "modelType": "chat",
  "config": { "model": "claude-opus-4-8", "apiBaseUrl": "...", "apiKeyRef": "ANTHROPIC_KEY" },
  "capabilities": { "intelligence": 1.0, "speed": 0.4, "cost": 0.15 },
  "tags": ["tools", "vision"],
  "contextWindow": 200000
}
```

**Convention — all axes are "higher = more desirable":**
- `intelligence`: 1.0 = smartest.
- `speed`: 1.0 = fastest.
- `cost`: 1.0 = **cheapest** (store *cheapness*, not price). This keeps the scoring math uniform — every axis is maximized.

The user assigns these (e.g. Opus → `intelligence: 1.0`; a local 8B → `intelligence: 0.3, speed: 0.9, cost: 1.0`). This is the "let the user define Opus as intelligent" requirement, made concrete.

## Resolver semantics (weighted priorities)

**Decision (chosen): weighted priorities.** Blueprint numbers are *how much the agent cares* about each axis; profile numbers are *how good the model is*. Score = weighted sum; pick the argmax.

```ts
// 1. HARD FILTER — categorical gates, applied first
const eligible = profiles.filter(p =>
  isChatCapable(p) &&
  (req.requires ?? []).every(tag => p.tags?.includes(tag)) &&
  (p.contextWindow ?? Infinity) >= (req.minContext ?? 0)
);

// 2. SOFT SCORE — weighted sum of priorities × capabilities
const scored = eligible.map(p => ({
  p,
  s: req.prefers.intelligence * p.capabilities.intelligence
   + req.prefers.speed        * p.capabilities.speed
   + req.prefers.cost         * p.capabilities.cost,
}));

// 3. PICK — argmax, deterministic tiebreak by cheapness, log top-2
scored.sort((a, b) => b.s - a.s || b.p.capabilities.cost - a.p.capabilities.cost);
debug(`resolved "${req.name}" → ${scored[0]?.p.key} (${scored[0]?.s.toFixed(2)}); ` +
      `runner-up ${scored[1]?.p.key} (${scored[1]?.s.toFixed(2)})`);
return scored[0]?.p;
```

Properties:
- **Smooth trade-offs.** An agent weighting `intelligence: 0.8` against `cost: 0.3` naturally lands on a capable-but-not-priciest model.
- **Deterministic.** Same blueprint + same registry → same choice; tiebreak by cheapness avoids coin-flips.
- **Observable.** Always logs winner + runner-up + scores.
- **Normalization (optional).** Normalize `prefers` to sum to 1 so scores are comparable across blueprints; not required for argmax within one blueprint.

## Pitfalls baked into the design

1. **The axes are anti-correlated.** Intelligence↑ usually ⇒ cost↑, speed↓. `{intelligence:1, speed:1, cost:1}` is unsatisfiable by any real model. Weighted-sum degrades gracefully (it finds the best *compromise*), but blueprint authors must understand the numbers are **priorities, not demands**. Documented in the user guide.
2. **Capabilities ≠ preferences.** "needs tool-calling / vision / JSON mode / on-prem-only / min context" are **categorical** and belong in `requires` as filters — *not* encoded as 0–1 preferences. Scoring a hard requirement as a soft weight silently lets an incapable model win.
3. **Scores drift / are subjective.** Human-assigned `intelligence` ages as models change. Mitigations: (a) ship sensible defaults for known models; (b) keep capabilities in the per-deployment registry, never in the portable blueprint; (c) **evolution path** — derive `speed` from measured latency and `cost` from a price table via `MetricsCollector`, leaving only `intelligence` human-assigned.
4. **Empty eligible set.** If hard filters reject everything, fail loud with a clear error naming the unmet gate (`requires: ["vision"] but no profile is tagged "vision"`), plus an optional configurable fallback profile.

## Resolution timing & overrides

- **When:** resolve at **bind/load time** (deterministic, cacheable). Re-resolve on registry change. Per-request dynamic routing (escalate-on-failure, downshift-under-budget) is a later enhancement and composes with the same scorer.
- **Escape hatch:** a blueprint may still pin a profile explicitly (`"model": { "profile": "opus" }`) or keep the legacy `llmProvider` block. Resolution order: explicit `profile` → `prefers` resolver → legacy `llmProvider` → system default. **Full back-compat:** existing bots with `llmProvider` are untouched.

## Migration plan

The 6 demo bots in [`config/bots/`](../config/bots/) migrate mechanically:

| Bot | Today | Suggested `prefers` |
|---|---|---|
| DevOpsBot | `openai/gpt-4o-mini` | `intelligence 0.7, speed 0.6, cost 0.5` + `requires:["tools"]` |
| SupportBot | `openai/gpt-4o-mini` | `intelligence 0.5, speed 0.7, cost 0.7` |
| AnalyticsBot | `perplexity/sonar` | `intelligence 0.8, speed 0.4, cost 0.4` |
| SalesAssistant | `flowise` | (keep `llmProvider` — flowise is an orchestrator, not a raw model) |
| OnboardingHelper | `openwebui` | `intelligence 0.4, speed 0.8, cost 0.9` |
| CreativeWriterBot | — | `intelligence 0.9, speed 0.3, cost 0.2` |

Migration is opt-in and reversible: leaving `llmProvider` in place keeps old behavior; adding a `model.prefers` block switches a bot to capability routing.

## Relationship to the Letta / LiteLLM stack

The same abstraction generalizes the Letta side. There, all agents share the `minimax-m3` LiteLLM alias on `.107`, and the `large`/`small`/`auxiliary` tiers are already a **coarse, one-axis** version of capability routing. A future unification: a Letta agent expresses `prefers`, and the resolver maps it onto a LiteLLM alias instead of an open-hivemind profile — one routing concept, two backends.

## Open questions

1. **Capability source of truth** — start fully user-assigned, or ship a seed table of known-model defaults (Opus/Sonnet/Haiku/gpt-4o/llama-3.3) that users override?
2. **Embeddings** — embedding selection already flows through `getDefaultEmbeddingProfileKey()`. Keep it separate (recommended), or let blueprints express embedding `prefers` too?
3. **Per-task × per-blueprint** — should `taskLlmRouter` tasks also be expressible as `prefers` vectors, replacing the explicit env-var overrides?
4. **Budget ceilings** — add a hard `maxCostPerCall` gate alongside the soft `cost` preference?

## Implementation checklist (when approved)

- [ ] Extend `ProviderProfile` (`llmProfiles.ts`) with optional `capabilities`, `tags`, `contextWindow`; `normalizeProfile` defaults them.
- [ ] Add `model` block types for blueprints (`requires`, `minContext`, `prefers`, optional `profile`).
- [ ] New `src/llm/resolveProfile.ts` — pure function (filter → score → argmax → log), no I/O, easily unit-tested.
- [ ] Wire into `getLlmProviderForBot` as the path when no explicit `llmProvider`/`profile` is set; preserve resolution order.
- [ ] Unit tests: filtering on `requires`/`minContext`, weighted-sum ranking, empty-eligible error, deterministic tiebreak, back-compat passthrough.
- [ ] Docs: blueprint authoring guide (priorities-not-demands) in `USER_GUIDE.md`.
