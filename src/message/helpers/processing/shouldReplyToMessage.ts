import messageConfig from '@config/messageConfig';
import Debug from 'debug';
import { shouldReplyToUnsolicitedMessage } from '../unsolicitedMessageHandler';

import { IncomingMessageDensity } from './IncomingMessageDensity';
import { getLastBotActivity } from './ChannelActivity';
import { isBotNameInText } from './MentionDetector';
import { isOnTopic } from './SemanticRelevanceChecker';

const debug = Debug('app:shouldReplyToMessage');

export interface ReplyDecision {
  shouldReply: boolean;
  reason: string;
  meta?: Record<string, any>;
}

export async function shouldReplyToMessage(
  message: any,
  botId: string,
  platform: 'discord' | 'generic',
  botNameOrNames?: string | string[],
  historyMessages?: any[]
): Promise<ReplyDecision> {
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
    (typeof message.getUserMentions === 'function' && (message.getUserMentions() || []).includes(botId)) ||
    text.includes(`<@${botId}>`) ||
    text.includes(`<@!${botId}>`);  // Discord nickname mention format

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

  // If configured to only respond when spoken to, check grace window for non-addressed messages
  if (onlyWhenSpokenTo && !isDirectlyAddressed) {
    const graceMsRaw = messageConfig.get('MESSAGE_ONLY_WHEN_SPOKEN_TO_GRACE_WINDOW_MS');
    const graceMs = typeof graceMsRaw === 'number' ? graceMsRaw : Number(graceMsRaw) || 0;

    let lastActivityTime = -1;
    let timeSinceLastActivity = -1;

    if (graceMs > 0) {
      lastActivityTime = getLastBotActivity(channelId, botId);
      timeSinceLastActivity = Date.now() - lastActivityTime;
      if (lastActivityTime > 0 && timeSinceLastActivity <= graceMs) {
        debug(`MESSAGE_ONLY_WHEN_SPOKEN_TO grace window active; proceeding to probability check.`);
        // Fall through to probability check
      } else {
        debug('MESSAGE_ONLY_WHEN_SPOKEN_TO enabled and not addressed, no grace; not replying.');
        return {
          shouldReply: false,
          reason: 'Not addressed (OnlyWhenSpokenTo)',
          meta: {
            mods: 'none',
            last: timeSinceLastActivity >= 0 ? `${Math.round(timeSinceLastActivity / 1000)}s` : 'never'
          }
        };
      }
    } else {
      debug('MESSAGE_ONLY_WHEN_SPOKEN_TO enabled and not addressed; not replying.');
      return {
        shouldReply: false,
        reason: 'Not addressed (OnlyWhenSpokenTo)',
        meta: { mods: 'none' }
      };
    }
  }

  // Note: Direct mentions will get +1.0 bonus via applyModifiers, guaranteeing response


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
      const lastActivity = getLastBotActivity(channelId);
      const lastStr = lastActivity > 0 ? `${Math.round((Date.now() - lastActivity) / 1000)}s` : 'never';
      return {
        shouldReply: false,
        reason: 'Unsolicited handler rejected (inactive channel)',
        meta: { mods: 'none', last: lastStr }
      };
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
  // Default: 95% if bot has been active recently, 1% if silent
  const configuredChance = typeof baseChanceRaw === 'number' ? baseChanceRaw : Number(baseChanceRaw);

  let chance: number;
  if (hasPostedRecently) {
    // Bot was active in last 5 minutes - high chance to continue conversation
    chance = configuredChance || 0.95; // 95% default when active
    debug(`Recent activity detected (<5m). Using high engagement chance: ${(chance * 100).toFixed(0)}%`);
    console.debug(`🔥 ACTIVE | channel: ${channelId} | bot: ${botId} | chance: ${(chance * 100).toFixed(0)}% | last: ${(timeSinceLastActivity / 1000).toFixed(0)}s ago`);
  } else {
    // Bot has been silent - low chance to re-engage
    chance = 0.01; // 1% if silent for > 5 mins
    debug(`Long silence detected (>5m). Chance dropped to 1%.`);
    console.debug(`💤 INACTIVE | channel: ${channelId} | bot: ${botId} | chance: 1% | last: ${(timeSinceLastActivity / 1000).toFixed(0)}s ago`);

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
  }
  const baseChance = chance; // Store for meta logs

  // 2. Incoming Message Density Logic (1/N scaling)
  // "If 5 messages in a minute, chance is 1/5 of current chance?"
  // User said: "after say 5 messages ina minute it is like 1/5 chance"
  // If base is 0.2, then 0.2 * 0.2 = 0.04.
  // We record this message as part of the density check
  chance *= densityModifier;
  debug(`Applied density modifier: ${densityModifier.toFixed(2)}. Chance: ${chance}`);

  // 3. Semantic Relevance Bonus (only when bot has posted recently AND message is on-topic)
  // This gives +0.9 flat bonus for continuing a conversation the bot is already in
  let isSemanticRelevant = false;
  const mods: string[] = [];
  if (hasPostedRecently) mods.push('+Recent');

  if (hasPostedRecently && historyMessages && historyMessages.length > 0) {
    try {
      // Build context from last few messages
      const recentContext = historyMessages
        .slice(-5)
        .map((m: any) => {
          const author = m.getAuthorId?.() || 'unknown';
          const text = m.getText?.() || '';
          return `${author}: ${text}`;
        })
        .join('\n');

      const newMessage = message.getText?.() || '';
      isSemanticRelevant = await isOnTopic(recentContext, newMessage);

      if (isSemanticRelevant) {
        // +0.9 flat bonus for on-topic + recently posted (continuing a conversation)
        chance += 0.9;
        mods.push('+OnTopic');
        debug(`On-topic + recent: applied +0.9 bonus. Chance: ${chance}`);
      }
    } catch (err) {
      debug(`Semantic relevance check error:`, err);
    }
  }

  const modResult = applyModifiers(message, botId, platform, chance, isDirectlyAddressed);
  chance = modResult.chance;
  const allMods = [...mods, modResult.modifiers !== 'none' ? modResult.modifiers : ''].filter(Boolean).join('') || 'none';

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
      chance: Number(chance.toPrecision(3)),
      roll: Number(roll.toPrecision(3)),
      mods: allMods,
      base: Number(baseChance.toPrecision(2)),
      density: Number(densityModifier.toPrecision(2)),
      last: isNaN(timeSinceLastActivity) ? 'never' : `${Math.round(timeSinceLastActivity / 1000)}s`
    }
  };
}

function applyModifiers(
  message: any,
  botId: string,
  platform: 'discord' | 'generic',
  chance: number,
  isDirectlyAddressed: boolean = false
): { chance: number; modifiers: string } {
  const text = (message.getText?.() || '').toLowerCase();
  const mods: string[] = [];

  // Direct mention bonus (+1.0 = guaranteed response)
  if (isDirectlyAddressed) {
    chance += 1.0;
    mods.push('+Mention');
    debug(`Direct mention/wakeword detected. Applied +1.0 bonus. New chance: ${chance}`);
  }

  // Question mark bonus (+0.2)
  if (text.includes('?')) {
    chance += 0.2;
    mods.push('+Q');
    debug(`Question mark detected. Applied +0.2 bonus. New chance: ${chance}`);
  }

  // Exclamation mark bonus (+0.1)
  if (text.includes('!')) {
    chance += 0.1;
    mods.push('+!');
    debug(`Exclamation mark detected. Applied +0.1 bonus. New chance: ${chance}`);
  }

  // Short message penalty
  if (text.length < 10) {
    const penalty = Number(messageConfig.get('MESSAGE_SHORT_LENGTH_PENALTY')) || 0;
    if (penalty > 0) {
      chance -= penalty;
      mods.push(`-Short(${penalty})`);
      debug(`Short message detected (<10 chars). Applied penalty: ${penalty}. New chance: ${chance}`);
    }
  }

  // Bot-to-bot penalty (-0.1 by default to taper out discussions, resurrected by idle response)
  if (typeof message.isFromBot === 'function' && message.isFromBot()) {
    const botModifier = Number(messageConfig.get('MESSAGE_BOT_RESPONSE_MODIFIER')) || -0.1;
    chance += botModifier;
    mods.push(`${botModifier >= 0 ? '+' : ''}Bot(${botModifier})`);
    debug(`Message from another bot. Applied modifier: ${botModifier}. New chance: ${chance}`);
  }

  // Channel bonus multiplier
  const channelBonuses: Record<string, number> = (messageConfig.get as any)('CHANNEL_BONUSES') || {};
  const channelBonus = typeof channelBonuses?.[message.getChannelId()] === 'number' ? channelBonuses[message.getChannelId()] : 1.0;
  if (channelBonus !== 1.0) {
    chance *= channelBonus;
    mods.push(`×Chan(${channelBonus})`);
    debug(`Applied channel bonus multiplier: ${channelBonus}. New chance: ${chance}`);
  }

  return { chance, modifiers: mods.join('') || 'none' };
}
