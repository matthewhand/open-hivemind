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
  console.debug(`📝 ACTIVITY | Recorded bot activity | channel: ${channelId} | bot: ${botId || 'any'} | time: ${new Date(now).toISOString()}`);
}

export function getLastBotActivity(channelId: string, botId?: string): number {
  if (botId) {
    const byBot = lastBotActivityByChannelAndBot.get(`${channelId}:${botId}`);
    if (byBot) {
      console.debug(`📖 ACTIVITY | Retrieved bot activity | channel: ${channelId} | bot: ${botId} | age: ${((Date.now() - byBot) / 1000).toFixed(1)}s`);
      return byBot;
    }
  }
  const byChannel = lastBotActivityByChannel.get(channelId) || 0;
  if (byChannel > 0) {
    console.debug(`📖 ACTIVITY | Retrieved channel activity | channel: ${channelId} | age: ${((Date.now() - byChannel) / 1000).toFixed(1)}s`);
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
