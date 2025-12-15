import Debug from 'debug';

const debug = Debug('app:ChannelActivity');

const lastBotActivityByChannel = new Map<string, number>();
const lastBotActivityByChannelAndBot = new Map<string, number>();

export function recordBotActivity(channelId: string, botId?: string): void {
  lastBotActivityByChannel.set(channelId, Date.now());
  if (botId) {
    lastBotActivityByChannelAndBot.set(`${channelId}:${botId}`, Date.now());
  }
  debug(`Recorded bot activity in ${channelId}`);
}

export function getLastBotActivity(channelId: string, botId?: string): number {
  if (botId) {
    const byBot = lastBotActivityByChannelAndBot.get(`${channelId}:${botId}`);
    if (byBot) return byBot;
  }
  return lastBotActivityByChannel.get(channelId) || 0;
}

// For tests
export function clearBotActivity(channelId?: string): void {
  if (channelId) {
    lastBotActivityByChannel.delete(channelId);
    // Clear any per-bot entries for this channel.
    for (const key of Array.from(lastBotActivityByChannelAndBot.keys())) {
      if (key.startsWith(`${channelId}:`)) lastBotActivityByChannelAndBot.delete(key);
    }
    return;
  }
  lastBotActivityByChannel.clear();
  lastBotActivityByChannelAndBot.clear();
}
