import Debug from 'debug';

const debug = Debug('app:ChannelActivity');

const lastBotActivityByChannel = new Map<string, number>();
const lastBotActivityByChannelAndBot = new Map<string, number>();

export function recordBotActivity(channelId: string, botId?: string): void {
  const now = Date.now();
  lastBotActivityByChannel.set(channelId, now);
  if (botId) {
    lastBotActivityByChannelAndBot.set(`${channelId}:${botId}`, now);
  }
  debug(`Recorded bot activity in ${channelId}`);
  debug(`Recorded bot activity in ${channelId}`);
}

export function getLastBotActivity(channelId: string, botId?: string): number {
  if (botId) {
    const byBot = lastBotActivityByChannelAndBot.get(`${channelId}:${botId}`);
    if (byBot) {
      return byBot;
    }
  }
  const byChannel = lastBotActivityByChannel.get(channelId) || 0;
  if (byChannel > 0) {
    debug(`Retrieved channel activity: age ${((Date.now() - byChannel) / 1000).toFixed(1)}s`);
  }
  return byChannel;
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
