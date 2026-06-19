# How the Society Works — Engagement & Coordination

> This is the deep-dive behind the [Vision](../VISION.md)'s "society of agents." It
> documents the **actual mechanisms** that decide whether a bot speaks and how multiple
> bots share a channel — with the source anchors and config knobs that control them.
> Where a behaviour is partial or simplified, this page says so.

There are **two independent decisions** between an incoming message and a bot reply:

1. **"Do *I* want to speak?"** — a per-bot engagement decision
   (`src/message/helpers/processing/shouldReplyToMessage.ts`, surfaced as the pipeline
   `DecisionStage`). This is where agency, attention, and social anxiety live.
2. **"Given the other bots, should I be the one to speak?"** — cross-bot arbitration
   (`src/services/SwarmCoordinator.ts`). This is where coordination lives.

A bot replies only when **both** say yes.

---

## Decision 1 — per-bot engagement

### Direct address short-circuits the gate

If a message **mentions** the bot, is a **reply** to it, is a **DM**, contains a
configured **wakeword** (`MESSAGE_WAKEWORDS`), or uses the bot's **name**, it is treated
as *directly addressed*: the unsolicited gate is skipped and a bonus is applied to the
roll. Talking *to* a bot reliably gets a response. Hard overrides also exist —
`FORCE_REPLY` forces a reply; `MESSAGE_IGNORE_BOTS` and `MESSAGE_ONLY_WHEN_SPOKEN_TO`
suppress it.

### Unsolicited messages are gated, then rolled

For messages that are *not* directly addressed:

1. **Activity gate.** `shouldReplyToUnsolicitedMessage(...)` rejects channels the bot
   considers inactive (it hasn't been "spoken into" within the grace window
   `MESSAGE_ONLY_WHEN_SPOKEN_TO_GRACE_WINDOW_MS`). A quiet channel ⇒ stay quiet.
2. **Probability roll.** The bot rolls a random value against a per-bot threshold and
   replies only if it passes. **Silence is the common, intended outcome.**

### Social anxiety — the penalties that shape the roll

The threshold is modulated by signals computed from the **last 15 messages** of history,
so a bot becomes *less* likely to chime in as a room gets busier or as it has been
dominating:

| Signal | Effect | Knob (default) | Source |
|---|---|---|---|
| **Self-domination** — the bot already posted recently | penalty grows per prior self-message, capped at −0.5 | `MESSAGE_UNSOLICITED_BOT_HISTORY_PENALTY_PER_MESSAGE` (0.1) | `shouldReplyToMessage.ts:342` |
| **Verbosity** — the bot has spent many tokens | small penalty ∝ its own token count | hardcoded `selfTokenCount * 0.0001` | `:346` |
| **Crowd size** — many distinct humans active | penalty ∝ (unique users − 1) | `MESSAGE_UNSOLICITED_USER_COUNT_PENALTY_PER_USER` (0.02) | `:347` |
| **Channel density / participation** | feeds probabilistic throttling | — | `IncomingMessageDensity`, `GlobalActivityTracker` |

The net effect is the "social anxiety" described in the vision: a bot avoids pile-ons and
talking over itself, without any explicit "max bots" rule.

### Momentum

Once a bot has engaged, idle/turn tracking (`IdleResponseManager`) keeps it in the
conversation it joined without needing to be re-prompted each turn.

### Everything is observable

Each decision records its **roll**, **threshold**, and **reason** to a `decisions` table
(`src/database/repositories/DecisionRepository.ts`) and emits to the live activity feed,
so "why did it / didn't it answer" is always inspectable — never a black box.

---

## Decision 2 — cross-bot coordination (SwarmCoordinator)

When several bots in the same channel each *want* to reply, the `SwarmCoordinator`
arbitrates per message. The mode is chosen per **Response Profile** (the swarm-mode cards
in the admin UI). Claims live in a 5-minute TTL cache keyed by message id.

| Mode | Behaviour | Notes |
|---|---|---|
| **Exclusive** (First Bot Wins) | First bot to claim the message replies; others skip. The same bot may re-claim. | Default; cleanest in busy channels. |
| **Broadcast** (All Respond) | Every bot that wants to reply does. | Coordinator is a pass-through; engagement decision still gates each bot. |
| **Rotating** (Round Robin) | A per-channel counter picks whose "turn" it is (`counter % activeBotCount`); only that bot replies. | Active-bot set is learned as bots participate. |
| **Priority** (Ranked) | First claimant wins and is marked rank 1. | ⚠️ **Partial today:** the code records `priorityRank` but does **not** actually compare priorities — later claimants always lose regardless of rank. True ranked pre-emption is a roadmap item. |
| **Collaborative** (Combine) | All contributors are tracked and contribute toward one shared response. | Contributor set is exposed via `getCollaborators(messageId)`. |

Claims emit `claim:created` / `claim:released` events and are queryable
(`getActiveClaims`, `getClaimStats`), so coordination is observable like engagement is.

---

## Putting it together

```
incoming message
      │
      ▼
┌─────────────────────────────┐   directly addressed? ─yes─► skip gate (+bonus)
│  Decision 1: do I want to    │
│  speak? (per bot)            │   else ─► activity gate ─► roll vs threshold
│   roll vs threshold,         │            (penalties: self-domination,
│   minus social penalties     │             verbosity, crowd size, density)
└─────────────┬───────────────┘
              │ yes
              ▼
┌─────────────────────────────┐
│  Decision 2: should I be the │   mode = exclusive | broadcast |
│  one? (across bots)          │          rotating | priority | collaborative
│   SwarmCoordinator.decide()  │
└─────────────┬───────────────┘
              │ yes
              ▼
           bot replies   (roll/threshold/reason persisted + streamed to activity feed)
```

## Tuning quick-reference

| Want… | Set |
|---|---|
| A bot that only answers when addressed | `MESSAGE_ONLY_WHEN_SPOKEN_TO=true` |
| Custom trigger words | `MESSAGE_WAKEWORDS=hey bot,assistant` |
| Less self-repetition | raise `MESSAGE_UNSOLICITED_BOT_HISTORY_PENALTY_PER_MESSAGE` |
| Quieter in crowded channels | raise `MESSAGE_UNSOLICITED_USER_COUNT_PENALTY_PER_USER` |
| Longer "engaged" memory of a channel | raise `MESSAGE_ONLY_WHEN_SPOKEN_TO_GRACE_WINDOW_MS` |
| One reply per message across all bots | Response Profile → **Exclusive** |
| Bots take turns | Response Profile → **Rotating** |

See also: [Vision & Status](../VISION.md) · [Architecture Overview](../architecture/overview.md) · [ROADMAP.md](../../ROADMAP.md) (for the priority-mode and channel-routing gaps).
