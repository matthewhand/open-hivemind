import Debug from 'debug';

const debug = Debug('app:ChannelActivity');

const lastBotActivityByChannelAndBot = new Map<string, number>();

export function recordBotActivity(channelId: string, botId: string): void {
  const now = Date.now();
  lastBotActivityByChannelAndBot.set(`${channelId}:${botId}`, now);
  debug(`Recorded bot activity in ${channelId}:${botId}`);
}

export function getLastBotActivity(channelId: string, botId: string): number {
  return lastBotActivityByChannelAndBot.get(`${channelId}:${botId}`) || 0;
}

// For tests
export function clearBotActivity(channelId?: string): void {
  if (channelId) {
    for (const key of Array.from(lastBotActivityByChannelAndBot.keys())) {
      if (key.startsWith(`${channelId}:`)) lastBotActivityByChannelAndBot.delete(key);
    }
    return;
  }
  lastBotActivityByChannelAndBot.clear();
}
