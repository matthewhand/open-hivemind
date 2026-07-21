/* eslint-disable max-lines */
import crypto from 'crypto';
import Debug from 'debug';
import messageConfig from '@config/messageConfig';
import { MessageBus } from '../../../../events/MessageBus';
import TypingMonitor from '../../monitoring/TypingMonitor';
import { shouldReplyToUnsolicitedMessage } from '../../unsolicitedMessageHandler';
import { getLastBotActivity } from '../ChannelActivity';
import { GlobalActivityTracker } from '../GlobalActivityTracker';
import { IncomingMessageDensity } from '../IncomingMessageDensity';
import { getMessageSetting } from '../ResponseProfile';
import { isOnTopic } from '../SemanticRelevanceChecker';
import { computeIsLeadingAddress, detectAddressSignals } from './addressDetection';
import { applyModifiers, extractModifierTokens } from './applyModifiers';
import {
  generateColorizedModsSummary,
  generateProseExplanation,
  modsStringsToObject,
} from './proseExplanation';
import { resolvePersonaResponseBehavior } from './resolvePersonaResponseBehavior';
import type { HistoryMessageLike, MessageLike, ReplyDecision, ShouldReplyOptions } from './types';

const debug = Debug('app:shouldReplyToMessage');

export async function evaluateReplyDecision(
  message: MessageLike,
  botId: string,
  platform: 'discord' | 'generic',
  botNameOrNames?: string | string[],
  historyMessages?: HistoryMessageLike[],
  defaultChannelId?: string,
  botConfig?: Record<string, unknown>,
  options?: ShouldReplyOptions
): Promise<ReplyDecision> {
  if (process.env.FORCE_REPLY && process.env.FORCE_REPLY.toLowerCase() === 'true') {
    debug('FORCE_REPLY env var enabled. Forcing reply.');
    return { shouldReply: true, reason: 'FORCE_REPLY env var enabled' };
  }

  const channelId = message.getChannelId();
  debug(`Evaluating message in channel: ${channelId}`);

  // Resolve persona-level response behavior overrides (persona first, global fallback)
  const personaBehavior = await resolvePersonaResponseBehavior(botConfig);

  const onlyWhenSpokenTo =
    personaBehavior?.onlyWhenSpokenTo ??
    Boolean(getMessageSetting('MESSAGE_ONLY_WHEN_SPOKEN_TO', botConfig));
  const {
    text,
    isDirectMention,
    isReplyToBot,
    isReplyToOther,
    isWakeword,
    nameCandidates,
    isNameAddressed,
    isDM,
    isDirectlyAddressed,
    isFromBot,
  } = detectAddressSignals(message, botId, botNameOrNames);

  // Never respond to our own messages
  try {
    if (typeof message.getAuthorId === 'function' && message.getAuthorId() === botId) {
      debug('Message from bot itself. Not replying.');
      return { shouldReply: false, reason: 'Message from self' };
    }
  } catch (error) {
    debug('Error checking if message is from self:', error);
  }

  // 1. Global Ignore Bots
  if (isFromBot) {
    const ignoreBots = Boolean(messageConfig.get('MESSAGE_IGNORE_BOTS'));
    if (ignoreBots) {
      return { shouldReply: false, reason: 'Bots ignored via config' };
    }
    const limitToDefault = Boolean(
      messageConfig.get('MESSAGE_BOT_REPLIES_LIMIT_TO_DEFAULT_CHANNEL')
    );
    if (limitToDefault && defaultChannelId && channelId !== defaultChannelId) {
      return { shouldReply: false, reason: 'Bot replies limited to default channel' };
    }
  }

  // Grace window: applies independently of onlyWhenSpokenTo.
  // If the bot recently spoke in this channel, allow follow-up replies.
  const graceMsRaw =
    personaBehavior?.graceWindowMs ??
    getMessageSetting('MESSAGE_ONLY_WHEN_SPOKEN_TO_GRACE_WINDOW_MS', botConfig);
  const graceMs = typeof graceMsRaw === 'number' ? graceMsRaw : Number(graceMsRaw) || 0;
  const lastActivityTime = graceMs > 0 ? getLastBotActivity(channelId, botId) : 0;
  const timeSinceLastActivity =
    lastActivityTime > 0 ? Math.max(0, Date.now() - lastActivityTime) : Infinity;
  const withinGraceWindow = graceMs > 0 && lastActivityTime > 0 && timeSinceLastActivity <= graceMs;

  // Only When Spoken To: if enabled and not addressed AND not within grace, skip.
  if (onlyWhenSpokenTo && !isDirectlyAddressed && !withinGraceWindow) {
    debug('MESSAGE_ONLY_WHEN_SPOKEN_TO enabled and not addressed, no grace; not replying.');
    return {
      shouldReply: false,
      reason: 'Not addressed (OnlyWhenSpokenTo)',
      meta: {
        mods: 'none',
        last: lastActivityTime > 0 ? `${Math.round(timeSinceLastActivity / 1000)}s` : 'never',
      },
    };
  }

  // Safety by default: avoid bot-to-bot loops unless explicitly allowed.
  if (isFromBot && !isDirectlyAddressed) {
    const allowUnaddressedBots = Boolean(messageConfig.get('MESSAGE_ALLOW_BOT_TO_BOT_UNADDRESSED'));
    if (!allowUnaddressedBots && !withinGraceWindow) {
      return { shouldReply: false, reason: 'Unaddressed bot message disabled' };
    }
  }

  // If directly addressed (mention, reply, wakeword, DM, or name), skip unsolicited gating,
  // but still use the probability roll with a bonus (see applyModifiers).

  // Track participation/density for probabilistic throttling.

  const authorId = (() => {
    try {
      return typeof message.getAuthorId === 'function' ? String(message.getAuthorId()) : undefined;
    } catch {
      return undefined;
    }
  })();
  let density: IncomingMessageDensity | null = null;
  try {
    density = IncomingMessageDensity.getInstance();
    density.recordMessage(channelId, authorId, isFromBot);
  } catch (error) {
    debug('Error recording incoming message density:', error);
  }

  // Analyze history for penalties
  const recentHistory = historyMessages ? historyMessages.slice(-15) : [];
  const uniqueUsers = new Set<string>();
  const uniqueBots = new Set<string>();
  let botHistoryCount = 0;
  let selfTokenCount = 0;

  for (const msg of recentHistory) {
    try {
      const aid = msg.getAuthorId?.() || 'unknown';
      const isBot = msg.isFromBot?.() || false;
      if (aid === botId) {
        botHistoryCount++;
        const content = msg.getText?.() || '';
        selfTokenCount += Math.ceil(content.length / 4);
      } else if (isBot) {
        uniqueBots.add(aid);
      } else {
        uniqueUsers.add(aid);
      }
    } catch (error) {
      debug('Error analyzing recent history messages:', error);
    }
  }
  if (authorId && authorId !== botId) {
    if (isFromBot) {
      uniqueBots.add(authorId);
    } else {
      uniqueUsers.add(authorId);
    }
  }

  const botHistoryPenaltyPerMsg = Number(
    getMessageSetting('MESSAGE_UNSOLICITED_BOT_HISTORY_PENALTY_PER_MESSAGE', botConfig) ?? 0.1
  );
  const botHistoryPenalty = Math.max(-0.5, (botHistoryCount - 1) * botHistoryPenaltyPerMsg * -1);
  const tokenDensityPenalty = Math.max(0, selfTokenCount * 0.0001) * -1;
  const userCountPenaltyPerUser = Number(
    getMessageSetting('MESSAGE_UNSOLICITED_USER_COUNT_PENALTY_PER_USER', botConfig) ?? 0.02
  );
  const userCountPenalty =
    uniqueUsers.size > 1 ? Math.max(0, (uniqueUsers.size - 1) * userCountPenaltyPerUser) * -1 : 0;

  // Unsolicited handler gating
  if (!isDirectlyAddressed) {
    try {
      if (!shouldReplyToUnsolicitedMessage(message, botId, platform)) {
        const lastActivity = getLastBotActivity(channelId, botId);
        const lastStr =
          lastActivity > 0 ? `${Math.round((Date.now() - lastActivity) / 1000)}s` : 'never';
        return {
          shouldReply: false,
          reason: 'Unsolicited handler rejected (inactive channel)',
          meta: { mods: 'none', last: lastStr },
        };
      }
    } catch (err) {
      debug('Error in unsolicited message handler; not replying:', err);
      return {
        shouldReply: false,
        reason: 'Unsolicited handler error',
        meta: { error: String(err) },
      };
    }
  }

  const mods: string[] = [];
  let lastPostTime = getLastBotActivity(channelId, botId);
  const SILENCE_THRESHOLD =
    Number(getMessageSetting('MESSAGE_ONLY_WHEN_SPOKEN_TO_GRACE_WINDOW_MS', botConfig)) ||
    5 * 60 * 1000;

  if (historyMessages && historyMessages.length > 0) {
    for (let i = historyMessages.length - 1; i >= 0; i--) {
      const m = historyMessages[i];
      if (m.authorId === botId) {
        const tsRaw = m.timestamp || m.createdAt || 0;
        const timestamp = tsRaw instanceof Date ? tsRaw.getTime() : Number(tsRaw);
        if (timestamp > 0) {
          lastPostTime = Math.max(lastPostTime, timestamp);
          break;
        }
      }
    }
  }

  const timeSinceLastPost = lastPostTime > 0 ? Math.max(0, Date.now() - lastPostTime) : Infinity;
  const hasPostedRecently = timeSinceLastPost < SILENCE_THRESHOLD;
  const lastStr = lastPostTime > 0 ? `${Math.floor(timeSinceLastPost / 1000)}s ago` : 'never';

  let chance = 0.0;
  if (typeof personaBehavior?.baseChance === 'number') {
    chance = personaBehavior.baseChance;
  } else {
    const baseChanceRaw = getMessageSetting('MESSAGE_UNSOLICITED_BASE_CHANCE', botConfig);
    if (typeof baseChanceRaw === 'number') {
      chance = baseChanceRaw;
    } else if (typeof baseChanceRaw === 'string' && baseChanceRaw.trim() !== '') {
      chance = Number(baseChanceRaw);
    }
  }

  // Clamp base chance to [0, 1] to prevent misconfigured personas from spamming
  chance = Math.max(0, Math.min(1, chance));
  const baseChance = chance;
  mods.push(`Base(${baseChance.toFixed(2)} @ ${lastStr})`);

  if (hasPostedRecently) {
    const minutesElapsed = timeSinceLastPost / 60000;
    const recentBonus = 0.5 / (1 + minutesElapsed);
    chance += recentBonus;
    mods.push(`+Recent(+${recentBonus.toFixed(2)})`);
  } else {
    const windowRaw = getMessageSetting(
      'MESSAGE_UNSOLICITED_SILENCE_PARTICIPANT_WINDOW_MS',
      botConfig
    );
    const windowMs = typeof windowRaw === 'number' ? windowRaw : Number(windowRaw) || 5 * 60 * 1000;
    let participants = 1;
    try {
      if (density) {
        participants = density.getUniqueParticipantCount(channelId, windowMs);
      }
    } catch (error) {
      debug('Error getting unique participant count:', error);
    }
    participants = Math.max(1, participants);
    const participantPenalty = Math.max(0, participants - 2) * 0.05 * -1;
    if (participantPenalty !== 0) {
      chance += participantPenalty;
      mods.push(`-Participants(${participantPenalty.toFixed(2)})`);
    }
  }

  if (botHistoryPenalty < 0) {
    chance += botHistoryPenalty;
    mods.push(`BotHistory(${botHistoryPenalty.toFixed(2)})`);
  }
  if (userCountPenalty < 0) {
    chance += userCountPenalty;
    mods.push(`UserCount(${userCountPenalty.toFixed(2)})`);
  }
  if (tokenDensityPenalty < 0) {
    chance += tokenDensityPenalty;
    mods.push(`TokenDensity(${tokenDensityPenalty.toFixed(2)})`);
  }

  // Prevent bot-to-bot storms when the provided context contains no user messages at all.
  // Only apply when the triggering message is from a bot; do not penalize user-originated prompts.
  const botRatioPenaltyVal = Number(
    getMessageSetting('MESSAGE_UNSOLICITED_BOT_RATIO_PENALTY', botConfig) ?? 0.5
  );
  const botRatioPenalty = isFromBot && uniqueUsers.size === 0 ? -botRatioPenaltyVal : 0;
  chance += botRatioPenalty;
  mods.push(`BotRatio(${botRatioPenalty >= 0 ? '+' : ''}${botRatioPenalty.toFixed(2)})`);

  if (hasPostedRecently && historyMessages && historyMessages.length > 0) {
    try {
      const recentContext = historyMessages
        .slice(-5)
        .map((m: HistoryMessageLike) => `${m.getAuthorId?.() || 'unknown'}: ${m.getText?.() || ''}`)
        .join('\n');
      const newMessage = message.getText?.() || '';
      if (await isOnTopic(recentContext, newMessage)) {
        chance += 0.3;
        mods.push('+OnTopic(+0.3)');
      } else {
        chance -= 0.1;
        mods.push('-OffTopic(-0.1)');
      }
    } catch (error) {
      debug('Error analyzing semantics:', error);
    }
  }

  const isAddressedToSomeone =
    (typeof message.getUserMentions === 'function' &&
      (message.getUserMentions() || []).length > 0) ||
    /^@\w+/.test(text) ||
    isReplyToOther;
  if (isAddressedToSomeone && !isDirectlyAddressed) {
    chance -= 0.5;
    mods.push('AddressedToOther(-0.50)');
  }

  // Calculate Leading Address
  const isLeadingAddress = computeIsLeadingAddress(
    text,
    botId,
    nameCandidates,
    isDirectlyAddressed,
    isWakeword
  );

  const modResult = applyModifiers(
    message,
    botId,
    platform,
    chance,
    isDirectMention || isWakeword || isNameAddressed || isDM,
    isLeadingAddress,
    isReplyToBot,
    botConfig,
    personaBehavior
  );
  chance = modResult.chance;

  // 5. BurstTraffic: Per-bot - only count messages AFTER this bot's last post
  try {
    let msgsSinceLastPost = 0;
    let userPostedRecently = false;
    const oneMinuteAgo = Date.now() - 60000;

    if (historyMessages && historyMessages.length > 0 && lastPostTime > 0) {
      for (const msg of historyMessages) {
        const tsRaw = msg.timestamp || msg.createdAt || 0;
        const msgTime = tsRaw instanceof Date ? tsRaw.getTime() : Number(tsRaw);
        const aid = msg.getAuthorId?.() || '';
        const isBot = msg.isFromBot?.() || false;

        if (msgTime > lastPostTime && aid !== botId) {
          msgsSinceLastPost++;
        }
        // Check if a USER (not bot) posted in last minute
        if (!isBot && msgTime > oneMinuteAgo) {
          userPostedRecently = true;
        }
      }
    } else if (!lastPostTime || lastPostTime === 0) {
      // Bot has never posted - use full history count (capped)
      msgsSinceLastPost = historyMessages ? Math.min(historyMessages.length, 5) : 0;
    }

    // Check if current message is from a user (not bot)
    if (!isFromBot) {
      userPostedRecently = true;
    }

    // BurstTraffic penalty
    const burstTrafficPenaltyPerMsg = Number(
      getMessageSetting('MESSAGE_UNSOLICITED_BURST_TRAFFIC_PENALTY_PER_MESSAGE', botConfig) ?? 0.025
    );
    const burstPenalty = Math.max(-0.15, (msgsSinceLastPost - 1) * burstTrafficPenaltyPerMsg * -1);
    if (burstPenalty !== 0) {
      chance += burstPenalty;
      mods.push(`BurstTraffic(${burstPenalty.toFixed(2)})`);
    }

    // UserActive bonus - encourage engagement when users are present
    if (userPostedRecently) {
      chance += 0.2;
      mods.push('+UserActive(+0.20)');
    }

    // Quiet Channel Bonus (5 min window) - still global as it's about channel activity
    if (density) {
      const quietWindow = 300000;
      const { total: total5m } = density.getDensity(channelId, quietWindow);
      const quietBonus = 0.2 * Math.max(0, 1 - total5m / 5);
      if (quietBonus > 0) {
        chance += quietBonus;
        mods.push(`+QuietChannel(+${quietBonus.toFixed(2)})`);
      }
    }
  } catch (error) {
    debug('Error getting messages per minute for quiet bonus calculation:', error);
  }

  // 6. Global Activity (Fatigue) Penalty
  const activityScore = GlobalActivityTracker.getInstance().getScore(botId);
  const fatigueThreshold = Number(process.env.BOT_GLOBAL_SCORE_LIMIT) || 2.0;

  if (activityScore > fatigueThreshold) {
    const excess = activityScore - fatigueThreshold;
    const fatiguePenalty = Math.max(-0.9, -(excess * 0.05)); // Cap at -0.9

    // Only apply if significant
    if (Math.abs(fatiguePenalty) >= 0.01) {
      chance += fatiguePenalty;
      mods.push(`GlobalFatigue(${fatiguePenalty.toFixed(2)})`);
    }
  }

  const allModStrings = [...mods, ...extractModifierTokens(modResult.modifiers)].filter(Boolean);

  // Convert mods array to JSON object for cleaner output
  const modsObject = modsStringsToObject(allModStrings);

  // Crowded conversation multiplier: if bot hasn't posted recently and many others are typing,
  // multiply probability down to avoid joining an already crowded conversation.
  // 1 typer = 1.0x (no penalty), 2 typers = 0.75x, 3+ typers = 1/count
  if (!hasPostedRecently) {
    const channelId = message.getChannelId();
    const allTypingUsers = TypingMonitor.getInstance().getTypingUsers(channelId);
    const otherTypingCount = allTypingUsers.filter((uid: string) => uid !== botId).length;

    if (otherTypingCount > 0) {
      // Significant penalty: 1 typer = 0.5x, 2 typers = 0.33x, 3 typers = 0.25x
      const crowdedMultiplier = 1.0 / (otherTypingCount + 1);
      chance *= crowdedMultiplier;
      modsObject['Crowded'] = crowdedMultiplier;
    }
  }

  chance = Math.max(0, Math.min(1, chance));
  const randomBytes = crypto.randomBytes(4);
  const roll = randomBytes.readUInt32BE() / 0x100000000;
  const decision = roll < chance;

  // Generate human-readable prose explanation
  const prose = generateProseExplanation(
    modsObject,
    decision,
    isDirectlyAddressed,
    hasPostedRecently
  );

  // Emit orchestration decision for live thinking stream.
  // Skipped when invoked through the pipeline (DecisionStage owns the broadcast)
  // to avoid emitting `pipeline:decision` twice per message.
  if (!options?.suppressBroadcast) {
    const bus = MessageBus.getInstance();
    bus.emit('pipeline:decision', {
      botName: nameCandidates[0] || 'Unknown',
      messageId: message.getMessageId(),
      channelId: message.getChannelId(),
      shouldReply: decision,
      reason: prose,
      probabilityRoll: Number(roll.toPrecision(3)),
      threshold: Number(chance.toPrecision(3)),
      meta: {
        ...modsObject,
      },
    });
  }

  return {
    shouldReply: decision,
    reason: isDirectlyAddressed
      ? decision
        ? 'Directly addressed (chance roll success)'
        : 'Directly addressed (chance roll failure)'
      : decision
        ? 'Chance roll success'
        : 'Chance roll failure',
    meta: {
      probability: `<${Number(chance.toPrecision(3))}`,
      rolled: Number(roll.toPrecision(3)),
      mods: modsObject,
      prose,
      colorizedMods: generateColorizedModsSummary(modsObject),
    },
  };
}
