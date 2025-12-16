import messageConfig from '@config/messageConfig';
import Debug from 'debug';
import { shouldReplyToUnsolicitedMessage } from '../unsolicitedMessageHandler';

import { IncomingMessageDensity } from './IncomingMessageDensity';
import { getLastBotActivity } from './ChannelActivity';
import { isBotNameInText } from './MentionDetector';

const debug = Debug('app:shouldReplyToMessage');

export interface ReplyDecision {
  shouldReply: boolean;
  reason: string;
  meta?: Record<string, any>;
}

export function shouldReplyToMessage(
  message: any,
  botId: string,
  platform: 'discord' | 'generic',
  botNameOrNames?: string | string[]
): ReplyDecision {
  if (process.env.FORCE_REPLY && process.env.FORCE_REPLY.toLowerCase() === 'true') {
    debug('FORCE_REPLY env var enabled. Forcing reply.');
    return { shouldReply: true, reason: 'FORCE_REPLY env var enabled' };
  }

  const channelId = message.getChannelId();
  debug(`Evaluating message in channel: ${channelId}`);

  const onlyWhenSpokenTo = Boolean(messageConfig.get('MESSAGE_ONLY_WHEN_SPOKEN_TO'));
  const rawText = String(message.getText?.() || '');
  const text = rawText.toLowerCase();

  const wakewordsRaw = messageConfig.get('MESSAGE_WAKEWORDS');
  const wakewords = Array.isArray(wakewordsRaw)
    ? wakewordsRaw
    : String(wakewordsRaw).split(',').map(s => s.trim());

  const isDirectMention =
    (typeof message.mentionsUsers === 'function' && message.mentionsUsers(botId)) ||
    (typeof message.isMentioning === 'function' && message.isMentioning(botId)) ||
    (typeof message.getUserMentions === 'function' && (message.getUserMentions() || []).includes(botId));

  const isReplyToBot =
    (typeof message.isReplyToBot === 'function' && message.isReplyToBot()) ||
    ((message as any)?.metadata?.replyTo?.userId === botId);

  const isWakeword = wakewords.some((word: string) => word && text.startsWith(String(word).toLowerCase()));

  const namesRaw = Array.isArray(botNameOrNames) ? botNameOrNames : [botNameOrNames].filter(Boolean);
  const nameCandidates = Array.from(new Set(
    namesRaw
      .flatMap((n) => {
        const name = String(n || '').trim();
        if (!name) return [];
        // If the configured name includes an instance suffix like "Name #1", allow matching the base too.
        const base = name.replace(/\s*#\d+\s*$/i, '').trim();
        return base && base !== name ? [name, base] : [name];
      })
      .filter(Boolean)
  ));
  const isNameAddressed = nameCandidates.some((n) => isBotNameInText(rawText, n));
  const isDirectlyAddressed = isDirectMention || isReplyToBot || isWakeword || isNameAddressed;
  const isFromBot = (() => {
    try {
      return typeof message.isFromBot === 'function' ? Boolean(message.isFromBot()) : false;
    } catch {
      return false;
    }
  })();

  // Never respond to our own messages (provider-agnostic).
  try {
    if (typeof message.getAuthorId === 'function' && message.getAuthorId() === botId) {
      debug('Message from bot itself. Not replying.');
      return { shouldReply: false, reason: 'Message from self' };
    }
  } catch { }

  // If configured to only respond when spoken to, do it deterministically (no randomness).
  if (onlyWhenSpokenTo) {
    if (!isDirectlyAddressed) {
      const graceMsRaw = messageConfig.get('MESSAGE_ONLY_WHEN_SPOKEN_TO_GRACE_WINDOW_MS');
      const graceMs = typeof graceMsRaw === 'number' ? graceMsRaw : Number(graceMsRaw) || 0;

      let lastActivityTime = -1;
      let timeSinceLastActivity = -1;

      if (graceMs > 0) {
        lastActivityTime = getLastBotActivity(channelId, botId);
        timeSinceLastActivity = Date.now() - lastActivityTime;
        if (lastActivityTime > 0 && timeSinceLastActivity <= graceMs) {
          debug(`MESSAGE_ONLY_WHEN_SPOKEN_TO grace window active (${timeSinceLastActivity}ms <= ${graceMs}ms); replying.`);
          return {
            shouldReply: true,
            reason: 'Grace window active',
            meta: {
              timeSinceLastActivity: `${(timeSinceLastActivity / 1000).toFixed(1)}s`,
              graceDuration: `${(graceMs / 1000).toFixed(0)}s`
            }
          };
        }
      }
      debug('MESSAGE_ONLY_WHEN_SPOKEN_TO enabled and message is not directly addressed; not replying.');
      return {
        shouldReply: false,
        reason: 'Not directly addressed (OnlyWhenSpokenTo)',
        meta: {
          graceDuration: `${(graceMs / 1000).toFixed(0)}s`,
          timeSinceLastActivity: timeSinceLastActivity >= 0 ? `${(timeSinceLastActivity / 1000).toFixed(1)}s` : 'never',
          lastActivityTime: typeof lastActivityTime !== 'undefined' ? lastActivityTime : -1,
          withinGraceWindow: false
        }
      };
    }
    debug('Directly addressed; replying.');
    return { shouldReply: true, reason: 'Directly addressed' };
  }

  // If directly addressed, reply deterministically (mentions/wakewords/replies should always work).
  if (isDirectlyAddressed) {
    debug('Directly addressed; replying.');
    return { shouldReply: true, reason: 'Directly addressed' };
  }

  // Safety by default: avoid bot-to-bot loops unless explicitly allowed.
  // This only affects unaddressed bot messages. If a bot pings/replies/wakewords/names us, we reply normally.
  if (isFromBot) {
    // If the bot has spoken recently in this channel, allow continued interactivity even under conservative settings.
    // (This mirrors the "floodgates open" behavior for human users.)
    const graceMsRaw = messageConfig.get('MESSAGE_ONLY_WHEN_SPOKEN_TO_GRACE_WINDOW_MS');
    const graceMs = typeof graceMsRaw === 'number' ? graceMsRaw : Number(graceMsRaw) || 0;
    const lastActivityTime = graceMs > 0 ? getLastBotActivity(channelId, botId) : 0;
    const timeSinceLastActivity = lastActivityTime > 0 ? (Date.now() - lastActivityTime) : Number.POSITIVE_INFINITY;
    const withinGrace = graceMs > 0 && lastActivityTime > 0 && timeSinceLastActivity <= graceMs;

    const allowUnaddressedBots = Boolean(messageConfig.get('MESSAGE_ALLOW_BOT_TO_BOT_UNADDRESSED'));
    if (!allowUnaddressedBots && !withinGrace) {
      debug('Message from another bot and bot-to-bot unaddressed replies are disabled (and not within grace); not replying.');
      return { shouldReply: false, reason: 'Unaddressed bot message disabled' };
    }
  }

  // Record message traffic/participants (used for density + participant-aware unsolicited tuning).
  const densityModifier = IncomingMessageDensity.getInstance().recordMessageAndGetModifier(
    channelId,
    typeof message.getAuthorId === 'function' ? message.getAuthorId() : undefined
  );

  // Integrate Unsolicited Message Handler
  try {
    if (!shouldReplyToUnsolicitedMessage(message, botId, platform)) {
      debug('Unsolicited message handler rejected reply (bot inactive in channel & no direct mention)');
      return { shouldReply: false, reason: 'Unsolicited handler rejected (inactive channel)' };
    }
  } catch (err) {
    // Fail closed: unsolicited gating errors should never cause the bot to start replying broadly.
    debug('Error in unsolicited message handler; not replying:', err);
    return { shouldReply: false, reason: 'Unsolicited handler error', meta: { error: String(err) } };
  }

  // 1. Long Silence Penalty Logic
  const lastInteractionTime = getLastBotActivity(channelId, botId);
  const timeSinceLastActivity = Date.now() - lastInteractionTime;
  const SILENCE_THRESHOLD = 5 * 60 * 1000; // 5 minutes
  const hasPostedRecently = timeSinceLastActivity <= SILENCE_THRESHOLD;

  const baseChanceRaw = messageConfig.get('MESSAGE_UNSOLICITED_BASE_CHANCE');
  let chance = typeof baseChanceRaw === 'number' ? baseChanceRaw : Number(baseChanceRaw) || 0.50; // Default 50%
  const baseChance = chance; // Store for meta logs

  if (!hasPostedRecently) {
    chance = 0.01; // 1% if silent for > 5 mins (down from base, modified by participants below)
    debug(`Long silence detected (>5m). Chance dropped to 1%.`);

    // Participant-aware adjustment: if fewer unique participants are active, be more likely to join;
    // if many participants are active, be less likely to interject.
    const participantWindowMsRaw = messageConfig.get('MESSAGE_UNSOLICITED_SILENCE_PARTICIPANT_WINDOW_MS');
    const participantWindowMs = typeof participantWindowMsRaw === 'number'
      ? participantWindowMsRaw
      : Number(participantWindowMsRaw) || (5 * 60 * 1000);

    const participantCount = IncomingMessageDensity.getInstance().getUniqueParticipantCount(channelId, participantWindowMs);

    const refRaw = messageConfig.get('MESSAGE_UNSOLICITED_SILENCE_PARTICIPANT_REFERENCE');
    const reference = Math.max(1, Number(refRaw) || 2);

    const minRaw = messageConfig.get('MESSAGE_UNSOLICITED_SILENCE_PARTICIPANT_MIN_FACTOR');
    const maxRaw = messageConfig.get('MESSAGE_UNSOLICITED_SILENCE_PARTICIPANT_MAX_FACTOR');
    const minFactor = Math.max(0, Number(minRaw) || 0.25);
    const maxFactor = Math.max(minFactor, Number(maxRaw) || 3);

    const factor = Math.max(minFactor, Math.min(maxFactor, reference / Math.max(1, participantCount)));
    chance *= factor;
    debug(`Silent participant factor: participants=${participantCount} factor=${factor.toFixed(2)} chance=${chance}`);
  } else {
    debug(`Recent activity detected (<5m). Using base chance ${chance}.`);
  }

  // 2. Incoming Message Density Logic (1/N scaling)
  // "If 5 messages in a minute, chance is 1/5 of current chance?"
  // User said: "after say 5 messages ina minute it is like 1/5 chance"
  // If base is 0.2, then 0.2 * 0.2 = 0.04.
  // We record this message as part of the density check
  chance *= densityModifier;
  debug(`Applied density modifier: ${densityModifier.toFixed(2)}. Chance: ${chance}`);

  chance = applyModifiers(message, botId, platform, chance);
  // Clamp to [0, 1] to avoid pathological configs/modifiers.
  chance = Math.max(0, Math.min(1, chance));
  debug(`Final chance after applying all modifiers: ${chance}`);

  const roll = Math.random();
  const decision = roll < chance;
  debug(`Decision: ${decision} (chance = ${chance})`);

  return {
    shouldReply: decision,
    reason: decision ? 'Chance roll success' : 'Chance roll failure',
    meta: {
      chance,
      roll,
      baseChance,
      densityModifier,
      timeSinceLastActivity: isNaN(timeSinceLastActivity) ? 'never' : `${(timeSinceLastActivity / 1000).toFixed(1)}s`,
      hasPostedRecently
    }
  };
}

function applyModifiers(
  message: any,
  botId: string,
  platform: 'discord' | 'generic',
  chance: number
): number {
  const text = (message.getText?.() || '').toLowerCase();

  // NOTE: Direct mention / wakeword / reply-to-bot are handled deterministically in shouldReplyToMessage().

  if (text.length < 10) {
    const penalty = messageConfig.get('MESSAGE_SHORT_LENGTH_PENALTY') || 0;
    chance -= penalty;
    debug(`Short message detected (<10 chars). Applied penalty: ${penalty}. New chance: ${chance}`);
  }

  if (typeof message.isFromBot === 'function' && message.isFromBot()) {
    // Never auto-reply to bots at 100%; treat as an unsolicited opportunity unless directly addressed.
    const botModifier = messageConfig.get('MESSAGE_BOT_RESPONSE_MODIFIER') || 0;
    chance += botModifier;
    debug(`Message from another bot. Applied modifier: ${botModifier}. New chance: ${chance}`);
  }

  // Provider-agnostic channel bonus multiplier.
  const channelBonuses: Record<string, number> = (messageConfig.get as any)('CHANNEL_BONUSES') || {};
  const bonus = typeof channelBonuses?.[message.getChannelId()] === 'number' ? channelBonuses[message.getChannelId()] : 1.0;
  if (bonus !== 1.0) {
    chance *= bonus;
    debug(`Applied channel bonus multiplier: ${bonus}. New chance: ${chance}`);
  }

  return chance;
}
