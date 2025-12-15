import Debug from 'debug';

const debug = Debug('app:ChannelActivity');

const lastBotActivityByChannel = new Map<string, number>();

export function recordBotActivity(channelId: string): void {
  lastBotActivityByChannel.set(channelId, Date.now());
  debug(`Recorded bot activity in ${channelId}`);
}

export function getLastBotActivity(channelId: string): number {
  return lastBotActivityByChannel.get(channelId) || 0;
}

// For tests
export function clearBotActivity(channelId?: string): void {
  if (channelId) {
    lastBotActivityByChannel.delete(channelId);
    return;
  }
  lastBotActivityByChannel.clear();
}

