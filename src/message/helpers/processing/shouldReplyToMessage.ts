import messageConfig from '@message/interfaces/messageConfig';
import discordConfig from '@integrations/discord/interfaces/discordConfig';
import Debug from 'debug';

const debug = Debug('app:shouldReplyToMessage');

// Store for tracking interactions in channels
const channelsWithBotInteraction = new Map<string, number>();

let recentActivityDecayRate = messageConfig.get('MESSAGE_RECENT_ACTIVITY_DECAY_RATE');
let activityTimeWindow = messageConfig.get('MESSAGE_ACTIVITY_TIME_WINDOW');

export function setDecayConfig(newDecayRate: number, newTimeWindow: number): void {
  recentActivityDecayRate = newDecayRate;
  activityTimeWindow = newTimeWindow;
  debug(`Updated decay config: rate = ${recentActivityDecayRate}, window = ${activityTimeWindow}ms`);
}

export function markChannelAsInteracted(channelId: string): void {
  channelsWithBotInteraction.set(channelId, Date.now());
  debug(`Channel ${channelId} marked as interacted at ${Date.now()}.`);
}

export function shouldReplyToMessage(
  message: any,
  botId: string,
  platform: 'discord' | 'generic'
): boolean {
  // --- Force reply override ---
  if (process.env.FORCE_REPLY && process.env.FORCE_REPLY.toLowerCase() === 'true') {
    debug('FORCE_REPLY env var enabled. Forcing reply.');
    return true;
  }
  // --- End override ---

  const channelId = message.getChannelId();
  debug(`Evaluating message in channel: ${channelId}`);

  const lastInteractionTime = channelsWithBotInteraction.get(channelId) || 0;
  const timeSinceLastActivity = Date.now() - lastInteractionTime;
  debug(`Time since last activity: ${timeSinceLastActivity}ms`);

  let chance = 0.2; // Base chance before decay
  debug(`Initial base chance: ${chance}`);

  // Apply decay to the initial base chance
  const decayFactor = Math.max(
    0.5, // Minimum 50% chance retention
    Math.exp(-recentActivityDecayRate * (timeSinceLastActivity / activityTimeWindow))
  );
  chance *= decayFactor;
  debug(`Chance after decay: ${chance} (decay factor: ${decayFactor})`);

  // Apply key modifiers after decay
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

  const wakewords = messageConfig.get('MESSAGE_WAKEWORDS');
  if (wakewords.some((word: string) => text.startsWith(word))) {
    debug(`Wakeword detected. Chance set to 1.`);
    return 1;
  }

  if (/[!?]/.test(text.slice(-1))) {
    const interrobangBonus = messageConfig.get('MESSAGE_INTERROBANG_BONUS') || 0.3;
    chance += interrobangBonus;
    debug(`Interrobang detected. Applied bonus: ${interrobangBonus}. New chance: ${chance}`);
  }

  if (message.isFromBot()) {
    const botModifier = messageConfig.get('MESSAGE_BOT_RESPONSE_MODIFIER') || -1.0;
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
    const bonus = discordConfig.get('DISCORD_PRIORITY_CHANNEL_BONUS') || 1.1;
    chance += bonus;
    debug(`Priority channel detected. Applied bonus: ${bonus}. New chance: ${chance}`);
  }

  const channelBonuses = discordConfig.get('DISCORD_CHANNEL_BONUSES');
  const channelBonus = channelBonuses[message.getChannelId()] ?? 0.0;
  debug(`Applied channel bonus: ${channelBonus}. Final chance: ${chance * channelBonus}`);

  return chance * channelBonus;
}
