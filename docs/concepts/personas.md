# Personas — the identity layer

> In the [society of agents](society-of-agents.md), a **persona** is who an agent *is*.
> It supplies both the agent's **voice** (its system prompt) and its **social
> temperament** (how readily it speaks). This page documents how personas are defined,
> stored, bound to bots, and where each field actually takes effect — flagging what is
> behavioural versus what is metadata today.

Source of truth: `src/managers/PersonaManager.ts`, `src/server/routes/personas.ts`
(`/api/personas`), `src/config/botConfigFactory.ts`.

---

## What a persona is

A persona is a named identity with these fields (`Persona` interface):

| Field | Purpose | Wired to behaviour? |
|---|---|---|
| `name`, `description`, `category` | Human-facing identity / grouping | Metadata (WebUI) |
| `systemPrompt` | The instruction the LLM receives — the agent's **voice** | ✅ Yes — applied at the Inference stage |
| `responseBehavior` | The agent's **social temperament** — how it decides whether to chime in | ✅ Yes — read by the engagement decision |
| `traits[]` (`name`/`value`/`weight`) | Structured personality descriptors | Metadata today (stored & schema-validated; not consumed by the pipeline) |
| `avatarStyle` | Display/avatar hint | Metadata today |
| `isBuiltIn`, `usageCount`, `createdAt`, `updatedAt` | Bookkeeping | `usageCount` is tracked per use |

> **Honest note.** `systemPrompt` and `responseBehavior` are the two fields that change how
> an agent behaves. `traits` and `avatarStyle` are persisted and validated but are not yet
> read by the message pipeline — treat them as descriptive metadata, not behaviour knobs.

---

## Two things a persona controls

### 1. Voice — the system prompt (Inference stage)

When a bot runs the pipeline, the selected persona's `systemPrompt` becomes the base
system instruction sent to the LLM. The Inference stage composes the final prompt as the
persona prompt **plus** any retrieved memory context
(`src/message/handlers/inferenceProcessor.ts`), and the output stage strips any
system-prompt leakage from the reply (`outputProcessor.ts`).

A bot may **override** the persona's `systemPrompt` with its own system instruction while
still inheriting the persona's other fields (e.g. `responseBehavior`) — see
`src/config/botSchema.ts`.

### 2. Temperament — responseBehavior (Decision stage)

This is what makes a persona a *member of the society* and not just a prompt: the
engagement decision resolves the persona's `responseBehavior` from the bot's `persona` id
and uses it when deciding whether to reply
(`src/message/helpers/processing/shouldReplyToMessage.ts:44`). A "chatty" persona and a
"reserved" persona in the same channel will speak at different rates from identical
inputs. See [How the Society Works](society-of-agents.md) for the full decision.

---

## How a bot gets a persona

A bot references a persona **by id** through its `persona` config key (default
`'default'`), set via the `PERSONA` setting (`src/config/botConfigFactory.ts:132`). One
persona can be shared by many bots; changing the persona changes every bot that points at
it. Persona changes participate in hot-reload (`src/config/HotReloadManager.ts`).

---

## Storage & lifecycle

- **Built-in templates** ship in code (e.g. a default assistant, a creative writer, a
  technical-support specialist).
- On **first run**, editable copies of the built-ins are seeded into
  `config/user/custom-personas.json`; from then on that file is the editable store.
- **CRUD** is exposed at `/api/personas` and through `PersonaManager`:
  `getAllPersonas` / `getPersona`, `createPersona`, `updatePersona`,
  `clonePersona` (resets `usageCount`), `deletePersona`, and `incrementUsageCount`.
- **Events** are emitted for every change — `personasReloaded`, `personaCreated`,
  `personaUpdated`, `personaDeleted`, `personaUsed` — which is how the WebUI and live
  views stay in sync.

> **Legacy note.** A second, legacy persona store (`/api/agents/personas`) used to exist
> in parallel; it was removed and `PersonaManager` / `/api/personas` is now canonical. See
> [Legacy & superseded architectures](../legacy/README.md).

---

## Managing personas in the WebUI

The **Personas** admin page lists personas as cards with usage counts and supports
create, edit, clone, copy-system-prompt, and delete. See the
[User Guide](../USER_GUIDE.md) for the operator walkthrough.

---

## See also

- [How the Society Works](society-of-agents.md) — where `responseBehavior` feeds the reply decision
- [Vision & Status](../VISION.md) — personas as the identity layer of the society
- [Content Filtering](../features/content-filtering.md) · [Semantic Guardrails](../features/semantic-guardrails.md) — guards that constrain what any persona may say
- [ROADMAP.md](../../ROADMAP.md) — for the status of trait-driven behaviour and related items
