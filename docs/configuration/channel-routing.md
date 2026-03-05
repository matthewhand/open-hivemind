# Channel Routing Guide

Navigation: [Docs Index](../README.md) | [Configuration Overview](overview.md) | [Provider Cheatsheet](provider-cheatsheet.md)


This guide explains how to configure and use the ChannelRouter feature for prioritizing channels across providers (Discord, Slack, Mattermost). It includes examples for CSV/JSON configuration, enabling the feature flag, scoring behavior, tie-breakers, debug logging, and troubleshooting.

Prerequisites
- MESSAGE_CHANNEL_ROUTER_ENABLED=false by default. When disabled, all providers’ scoreChannel() return 0 to preserve legacy behavior.
- Providers expose:
  - supportsChannelPrioritization = true
  - scoreChannel(channelId: string, metadata?: Record<string, any>): number

Feature Flag
- MESSAGE_CHANNEL_ROUTER_ENABLED=true enables ChannelRouter behavior.
- When enabled, services delegate scoreChannel() to ChannelRouter.computeScore().

Configuration Overview
Channel bonuses and priorities can be provided via CSV or JSON through messageConfig. The router computes scores according to a simple formula and supports deterministic tie-breakers.

Key inputs:
- CHANNEL_BONUSES: Per-channel multipliers (>= 0). Higher bonus increases score.
- CHANNEL_PRIORITIES: Per-channel queueing priority (integer >= 0). Higher priority reduces immediate score to prefer lower-queue channels first.

Scoring Formula
For a given channelId:
score = base * bonus / (1 + priority)

Defaults:
- base defaults to 1 unless overridden by provider metadata or future extensions.
- bonus defaults to 1 if not configured.
- priority defaults to 0 if not configured.

Tie-breakers
When scores are equal, ChannelRouter uses:
1) Higher bonus first
2) Lexicographic channel ID ascending (e.g., "A" before "B")

CSV Examples
CHANNEL_BONUSES (CSV)
- Format: channelId:bonus pairs separated by commas
- Example:
  CHANNEL_BONUSES="channelA:1.5,channelB:1,channelC:2"

CHANNEL_PRIORITIES (CSV)
- Format: channelId:priority pairs separated by commas
- Example:
  CHANNEL_PRIORITIES="channelA:0,channelB:1,channelC:0"

JSON Examples
CHANNEL_BONUSES (JSON)
- Format: JSON object mapping channelId to numeric bonus
- Example:
  CHANNEL_BONUSES='{"channelA":1.5,"channelB":1,"channelC":2}'

CHANNEL_PRIORITIES (JSON)
- Format: JSON object mapping channelId to integer priority
- Example:
  CHANNEL_PRIORITIES='{"channelA":0,"channelB":1,"channelC":0}'

Environment Setup Examples
Minimal env (CSV):
MESSAGE_CHANNEL_ROUTER_ENABLED=true
CHANNEL_BONUSES="X:2,Y:1"
CHANNEL_PRIORITIES="X:0,Y:1"

Minimal env (JSON):
MESSAGE_CHANNEL_ROUTER_ENABLED=true
CHANNEL_BONUSES='{"X":2,"Y":1}'
CHANNEL_PRIORITIES='{"X":0,"Y":1}'

Expected Scoring Outcomes
Given:
- base=1
- Bonuses: X=2, Y=1
- Priorities: X=0, Y=1

Compute scores:
- X: 1 * 2 / (1 + 0) = 2
- Y: 1 * 1 / (1 + 1) = 0.5

Pick best channel among [X, Y] → X

End-to-End Usage
1) Enable the feature flag:
   MESSAGE_CHANNEL_ROUTER_ENABLED=true

2) Provide bonuses and/or priorities via CSV or JSON env:
   CHANNEL_BONUSES="A:1.5,B:1"
   CHANNEL_PRIORITIES="A:0,B:1"

3) Ensure your provider supports prioritization:
   - SlackService, DiscordService, MattermostService include:
     supportsChannelPrioritization = true
     scoreChannel() gated by MESSAGE_CHANNEL_ROUTER_ENABLED

4) When your app chooses a channel, it can call a provider’s scoreChannel() to compare candidates. Alternatively, if you maintain a candidate set, you can directly use ChannelRouter.pickBestChannel(candidates, metadata) to select the best.

Provider Integration Notes
- Slack: Wired to ChannelRouter behind MESSAGE_CHANNEL_ROUTER_ENABLED; supportsChannelPrioritization=true; scoreChannel delegates to ChannelRouter when enabled.
- Discord: Same gating semantics; includes runtime hardening for GatewayIntentBits via SafeGatewayIntentBits fallback to avoid issues in partial-mock environments.
- Mattermost: Same gating semantics.

Testing Guidance
- Unit tests cover parsing, scoring formula, and tie-breakers in tests/message/routing/ChannelRouter.test.ts
- Characterization tests validate provider gating behavior in tests/integrations/channelRouting/scoreChannel.gating.test.ts
  - Flag off → services return 0 and do not call computeScore
  - Flag on → delegates to ChannelRouter.computeScore

Debug Namespaces
Enable DEBUG logs to inspect routing decisions:
- app:ChannelRouter
- app:discordService
- app:SlackService:verbose
- app:SlackMessageIO
- app:SlackEventBus
- app:SlackBotFacade
- app:mattermostConfig
- app:slackConfig
- app:openaiConfig
- app:openWebUIConfig

Example:
DEBUG=app:ChannelRouter* npm test
DEBUG=app:ChannelRouter,app:discordService node dist/src/index.js

Troubleshooting
Common misconfigurations:
- Typos in channel IDs: If a channelId is missing from bonuses/priorities, defaults apply (bonus=1, priority=0) which may reduce the expected effect.
- Non-integer priority values: Non-integer priorities are ignored; ensure priorities are integers >= 0.
- Out-of-range or invalid bonuses: Invalid bonuses (e.g., negative) are ignored; ensure bonuses are >= 0.
- Feature flag off: If MESSAGE_CHANNEL_ROUTER_ENABLED=false or unset, scoreChannel() returns 0 and does not call ChannelRouter.

How to run just routing tests:
- npm test -- tests/message/routing/ChannelRouter.test.ts
- npm test -- tests/integrations/channelRouting/scoreChannel.gating.test.ts

Minimal Verification Snippet (pseudocode)
const enabled = process.env.MESSAGE_CHANNEL_ROUTER_ENABLED === 'true';
const score = service.scoreChannel('channelA');
if (!enabled) {
  // Expect 0 by design
} else {
  // Expect a positive score when bonuses/priorities favor the channel
}

Notes
- The router currently uses a simple base=1, subject to change if providers supply richer metadata.
- Tie-breakers ensure deterministic selection under equal scores.

Changelog
- Introduced MESSAGE_CHANNEL_ROUTER_ENABLED feature flag
- Implemented ChannelRouter with CSV/JSON config parsing for bonuses and priorities
- Added provider parity hooks for Slack, Discord, and Mattermost
- Added characterization tests to gate behavior under the feature flag