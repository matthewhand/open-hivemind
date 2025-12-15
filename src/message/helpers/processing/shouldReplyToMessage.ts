import messageConfig from '@config/messageConfig';
import discordConfig from '@config/discordConfig';
import Debug from 'debug';
import { shouldReplyToUnsolicitedMessage } from '../unsolicitedMessageHandler';

import { IncomingMessageDensity } from './IncomingMessageDensity';
import { getLastBotActivity } from './ChannelActivity';
import { isBotNameInText } from './MentionDetector';

const debug = Debug('app:shouldReplyToMessage');

export function shouldReplyToMessage(
  message: any,
  botId: string,
  platform: 'discord' | 'generic',
  botNameOrNames?: string | string[]
): boolean {
  if (process.env.FORCE_REPLY && process.env.FORCE_REPLY.toLowerCase() === 'true') {
    debug('FORCE_REPLY env var enabled. Forcing reply.');
    return true;
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
    text.includes(`<@!${botId}>`);

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

  // Never respond to our own messages.
  if (message.getAuthorId() === discordConfig.get('DISCORD_CLIENT_ID')) {
    debug(`Message from bot itself. Not replying.`);
    return false;
  }

  // Extra safety: never auto-reply to other bots unless directly addressed.
  try {
    if (typeof message.isFromBot === 'function' && message.isFromBot() && !isDirectlyAddressed) {
      debug('Message from another bot and not directly addressed; not replying.');
      return false;
    }
  } catch { }

  // If configured to only respond when spoken to, do it deterministically (no randomness).
  if (onlyWhenSpokenTo) {
    if (!isDirectlyAddressed) {
      const graceMsRaw = messageConfig.get('MESSAGE_ONLY_WHEN_SPOKEN_TO_GRACE_WINDOW_MS');
      const graceMs = typeof graceMsRaw === 'number' ? graceMsRaw : Number(graceMsRaw) || 0;
      if (graceMs > 0) {
        const lastActivityTime = getLastBotActivity(channelId, botId);
        const timeSinceLastActivity = Date.now() - lastActivityTime;
        if (lastActivityTime > 0 && timeSinceLastActivity <= graceMs) {
          debug(`MESSAGE_ONLY_WHEN_SPOKEN_TO grace window active (${timeSinceLastActivity}ms <= ${graceMs}ms); replying.`);
          return true;
        }
      }
      debug('MESSAGE_ONLY_WHEN_SPOKEN_TO enabled and message is not directly addressed; not replying.');
      return false;
    }
    debug('Directly addressed; replying.');
    return true;
  }

  // If directly addressed, reply deterministically (mentions/wakewords/replies should always work).
  if (isDirectlyAddressed) {
    debug('Directly addressed; replying.');
    return true;
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
      return false;
    }
  } catch (err) {
    // Fail closed: unsolicited gating errors should never cause the bot to start replying broadly.
    debug('Error in unsolicited message handler; not replying:', err);
    return false;
  }

  // 1. Long Silence Penalty Logic
  const lastInteractionTime = getLastBotActivity(channelId, botId);
  const timeSinceLastActivity = Date.now() - lastInteractionTime;
  const SILENCE_THRESHOLD = 5 * 60 * 1000; // 5 minutes

  const baseChanceRaw = messageConfig.get('MESSAGE_UNSOLICITED_BASE_CHANCE');
  let chance = typeof baseChanceRaw === 'number' ? baseChanceRaw : Number(baseChanceRaw) || 0.05;

  if (timeSinceLastActivity > SILENCE_THRESHOLD) {
    chance = 0.005; // 0.5% if silent for > 5 mins
    debug(`Long silence detected (>5m). Chance dropped to 0.5%.`);

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

  const decision = Math.random() < chance;
  debug(`Decision: ${decision} (chance = ${chance})`);

  return decision;
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

  if (platform === 'discord') {
    chance = applyDiscordBonuses(message, chance);
    debug(`After applying Discord-specific bonuses, chance: ${chance}`);
  }

  return chance;
}

function applyDiscordBonuses(message: any, chance: number): number {
  const priorityChannel = discordConfig.get('DISCORD_PRIORITY_CHANNEL');
  if (priorityChannel && message.getChannelId() === priorityChannel) {
    const bonus = discordConfig.get('DISCORD_PRIORITY_CHANNEL_BONUS');
    chance += bonus;
    debug(`Priority channel detected. Applied bonus: ${bonus}. New chance: ${chance}`);
  }

  const channelBonuses: Record<string, number> = discordConfig.get('DISCORD_CHANNEL_BONUSES') || {};
  const channelBonus = channelBonuses[message.getChannelId()] ?? 1.0;
  debug(`Applied channel bonus: ${channelBonus}. Final chance: ${chance * channelBonus}`);

  return chance * channelBonus;
}
