import messageConfig from '@config/messageConfig';
import discordConfig from '@config/discordConfig';
import Debug from 'debug';
import { shouldReplyToUnsolicitedMessage } from '../unsolicitedMessageHandler';

import { IncomingMessageDensity } from './IncomingMessageDensity';

const debug = Debug('app:shouldReplyToMessage');

const channelsWithBotInteraction = new Map<string, number>();

// Track bot activity to remove silence penalty
export function recordBotActivity(channelId: string): void {
  channelsWithBotInteraction.set(channelId, Date.now());
  debug(`Recorded bot activity in ${channelId}`);
}

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
  const lastInteractionTime = channelsWithBotInteraction.get(channelId) || 0;
  const timeSinceLastActivity = Date.now() - lastInteractionTime;
  const SILENCE_THRESHOLD = 5 * 60 * 1000; // 5 minutes

  let chance = 0.2; // Base chance

  if (timeSinceLastActivity > SILENCE_THRESHOLD) {
    chance = 0.005; // 0.5% if silent for > 5 mins
    debug(`Long silence detected (>5m). Chance dropped to 0.5%.`);
  } else {
    debug(`Recent activity detected (<5m). Using base chance 20%.`);
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
  const text = message.getText().toLowerCase();

  if (message.getAuthorId() === discordConfig.get('DISCORD_CLIENT_ID')) {
    debug(`Message from bot itself. Chance set to 0.`);
    return 0;
  }

  if (message.mentionsUsers(botId)) {
    debug(`Bot ID ${botId} mentioned. Responding.`);
    return 1;
  }

  const wakewordsRaw = messageConfig.get('MESSAGE_WAKEWORDS');
  const wakewords = Array.isArray(wakewordsRaw) ? wakewordsRaw : String(wakewordsRaw).split(',').map(s => s.trim())
    ;
  if (wakewords.some((word: string) => text.startsWith(word))) {
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
    // If the message is from a bot and made it this far, we're on the default channel
    // (filtered earlier in DiscordService), so give full probability to respond
    let limitToDefaultChannel = true;
    try {
      const limitConfig = require('@config/messageConfig').default.get('MESSAGE_BOT_REPLIES_LIMIT_TO_DEFAULT_CHANNEL');
      limitToDefaultChannel = limitConfig === undefined ? true : Boolean(limitConfig);
    } catch { }

    if (limitToDefaultChannel) {
      // On default channel with bot-to-bot enabled - always respond
      debug(`Message from bot on default channel. Setting chance to 1.`);
      return 1;
    } else {
      // Not limited to default channel - use the modifier
      const botModifier = messageConfig.get('MESSAGE_BOT_RESPONSE_MODIFIER');
      chance += botModifier;
      debug(`Message from another bot. Applied modifier: ${botModifier}. New chance: ${chance}`);
    }
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
