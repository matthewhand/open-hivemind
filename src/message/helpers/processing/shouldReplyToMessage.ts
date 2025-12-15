import messageConfig from '@config/messageConfig';
import discordConfig from '@config/discordConfig';
import Debug from 'debug';
import { shouldReplyToUnsolicitedMessage } from '../unsolicitedMessageHandler';

import { IncomingMessageDensity } from './IncomingMessageDensity';
import { getLastBotActivity } from './ChannelActivity';

const debug = Debug('app:shouldReplyToMessage');

export function shouldReplyToMessage(
  message: any,
  botId: string,
  platform: 'discord' | 'generic'
): boolean {
  if (process.env.FORCE_REPLY && process.env.FORCE_REPLY.toLowerCase() === 'true') {
    debug('FORCE_REPLY env var enabled. Forcing reply.');
    return true;
  }

  const channelId = message.getChannelId();
  debug(`Evaluating message in channel: ${channelId}`);

  const onlyWhenSpokenTo = Boolean(messageConfig.get('MESSAGE_ONLY_WHEN_SPOKEN_TO'));
  const text = (message.getText?.() || '').toLowerCase();

  const wakewordsRaw = messageConfig.get('MESSAGE_WAKEWORDS');
  const wakewords = Array.isArray(wakewordsRaw)
    ? wakewordsRaw
    : String(wakewordsRaw).split(',').map(s => s.trim());

  const isDirectMention =
    (typeof message.mentionsUsers === 'function' && message.mentionsUsers(botId)) ||
    (typeof message.isMentioning === 'function' && message.isMentioning(botId)) ||
    (typeof message.getUserMentions === 'function' && (message.getUserMentions() || []).includes(botId)) ||
    text.includes(`<@${botId}>`);

  const isReplyToBot =
    (typeof message.isReplyToBot === 'function' && message.isReplyToBot()) ||
    ((message as any)?.metadata?.replyTo?.userId === botId);

  const isWakeword = wakewords.some((word: string) => word && text.startsWith(String(word).toLowerCase()));

  const isDirectlyAddressed = isDirectMention || isReplyToBot || isWakeword;

  if (onlyWhenSpokenTo && !isDirectlyAddressed) {
    debug('MESSAGE_ONLY_WHEN_SPOKEN_TO enabled and message is not directly addressed; not replying.');
    return false;
  }

  // Integrate Unsolicited Message Handler
  try {
    if (!shouldReplyToUnsolicitedMessage(message, botId, platform)) {
      debug('Unsolicited message handler rejected reply (bot inactive in channel & no direct mention)');
      return false;
    }
  } catch (err) {
    debug('Error in unsolicited message handler, continuing with default logic:', err);
  }

  // 1. Long Silence Penalty Logic
  const lastInteractionTime = getLastBotActivity(channelId);
  const timeSinceLastActivity = Date.now() - lastInteractionTime;
  const SILENCE_THRESHOLD = 5 * 60 * 1000; // 5 minutes

  const baseChanceRaw = messageConfig.get('MESSAGE_UNSOLICITED_BASE_CHANCE');
  let chance = typeof baseChanceRaw === 'number' ? baseChanceRaw : Number(baseChanceRaw) || 0.05;

  if (timeSinceLastActivity > SILENCE_THRESHOLD) {
    chance = 0.005; // 0.5% if silent for > 5 mins
    debug(`Long silence detected (>5m). Chance dropped to 0.5%.`);
  } else {
    debug(`Recent activity detected (<5m). Using base chance ${chance}.`);
  }

  // 2. Incoming Message Density Logic (1/N scaling)
  // "If 5 messages in a minute, chance is 1/5 of current chance?"
  // User said: "after say 5 messages ina minute it is like 1/5 chance"
  // If base is 0.2, then 0.2 * 0.2 = 0.04.
  // We record this message as part of the density check
  const densityModifier = IncomingMessageDensity.getInstance().recordMessageAndGetModifier(channelId);
  chance *= densityModifier;
  debug(`Applied density modifier: ${densityModifier.toFixed(2)}. Chance: ${chance}`);

  chance = applyModifiers(message, botId, platform, chance);
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

  if (message.getAuthorId() === discordConfig.get('DISCORD_CLIENT_ID')) {
    debug(`Message from bot itself. Chance set to 0.`);
    return 0;
  }

  if (typeof message.mentionsUsers === 'function' && message.mentionsUsers(botId)) {
    debug(`Bot ID ${botId} mentioned. Responding.`);
    return 1;
  }

  const wakewordsRaw = messageConfig.get('MESSAGE_WAKEWORDS');
  const wakewords = Array.isArray(wakewordsRaw) ? wakewordsRaw : String(wakewordsRaw).split(',').map(s => s.trim());
  if (wakewords.some((word: string) => word && text.startsWith(String(word).toLowerCase()))) {
    debug(`Wakeword detected. Chance set to 1.`);
    return 1;
  }

  if (/[!?]/.test(text.slice(-1))) {
    const interrobangBonus = messageConfig.get('MESSAGE_INTERROBANG_BONUS');
    chance += interrobangBonus;
    debug(`Interrobang detected. Applied bonus: ${interrobangBonus}. New chance: ${chance}`);
  }

  if (text.length < 10) {
    const penalty = messageConfig.get('MESSAGE_SHORT_LENGTH_PENALTY') || 0;
    chance -= penalty;
    debug(`Short message detected (<10 chars). Applied penalty: ${penalty}. New chance: ${chance}`);
  }

  if (message.isFromBot()) {
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
