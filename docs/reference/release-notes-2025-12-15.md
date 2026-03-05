# Release Notes — 2025-12-15 (Message Gating, Pacing, Typing, Admin Robustness)

This release focuses on making agent responses *less chatty*, *more correctly targeted*, and *more human-paced* across integrations, with particular attention to Discord multi-bot behavior.

## Key outcomes

### Unsolicited response design: quieter by default
- Default behavior is now conservative: when `MESSAGE_ONLY_WHEN_SPOKEN_TO=true` (default), the bot responds only when directly addressed (mention, wakeword, reply-to-bot).
- Direct-address replies are deterministic (no RNG) so wakewords/mentions/replies always work.
- Unsolicited gating fails closed: if gating logic errors, the bot will not start replying broadly.
- Extra safety: bot-to-bot conversations are suppressed unless directly addressed.

### Pacing: slower and burst-aware
- A `MESSAGE_DELAY_MULTIPLIER` (default `3`) scales artificial delays for more human pacing.
- Burst coalescing: the first eligible message in a burst becomes the “leader”; subsequent messages extend the delay window so the eventual response can incorporate fresher context.
- Rate limiting is treated as *backoff delay* (not dropping replies): the bot can keep collecting messages and respond after the delay expires.

### Typing: correct bot identity + better balance
- Typing indicators now use the *same bot identity* as the sending bot (important for Discord swarm / multi-token mode).
- Typing starts after a short “read pause” (so it doesn’t instantly type on every message), and stays on through inference to avoid “typing stopped → long gap → reply”.

### Admin + config robustness
- Configuration handling and admin surfaces were hardened (validation, edge cases, safer defaults) to reduce runtime surprises.

## Notable implementation notes

### Core pipeline
- The message handler now explicitly separates:
  - eligibility gating (direct address vs unsolicited opportunity),
  - burst coalescing delay,
  - typing behavior,
  - inference,
  - line-by-line sending + pacing.

### Discord reply/mention correctness
- Reply-to-bot detection now works reliably by plumbing the referenced message into the wrapped message object when available.

## Configuration knobs

### Primary behavior toggles
- `MESSAGE_ONLY_WHEN_SPOKEN_TO` (default `true`): when enabled, only reply to direct addressing.
- `MESSAGE_WAKEWORDS`: wakewords that count as “spoken to”.

### Pacing / rate backoff
- `MESSAGE_DELAY_MULTIPLIER` (default `3`): scales artificial delays (pre-inference, coalescing window, per-line delays).
- `MESSAGE_COMPOUNDING_DELAY_BASE_MS`, `MESSAGE_COMPOUNDING_DELAY_MAX_MS`: bounds for burst coalescing.
- `MESSAGE_RATE_LIMIT_PER_CHANNEL`: used as backoff input to slow responses rather than suppress them.

### Unsolicited behavior (only relevant if `MESSAGE_ONLY_WHEN_SPOKEN_TO=false`)
- `MESSAGE_UNSOLICITED_BASE_CHANCE`
- `MESSAGE_ACTIVITY_TIME_WINDOW`
- `MESSAGE_UNSOLICITED_ADDRESSED`, `MESSAGE_UNSOLICITED_UNADDRESSED`

## Testing
- Jest suite passes (`npm test`).
- Added/updated tests around unsolicited gating, delay scheduling, burst behavior, and typing-related sequencing.

