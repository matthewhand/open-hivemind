import Debug from 'debug';

const debug = Debug('app:ChannelActivity');

const lastBotActivityByChannelAndBot = new Map<string, number>();

// Track all recent bot activity per channel for crosstalk detection
const recentChannelActivity = new Map<string, { botId: string; timestamp: number }[]>();
const ACTIVITY_WINDOW_MS = 30000; // 30 seconds

export function recordBotActivity(channelId: string, botId: string): void {
  const now = Date.now();
  lastBotActivityByChannelAndBot.set(`${channelId}:${botId}`, now);

  // Also track in the channel-wide activity list
  const activities = recentChannelActivity.get(channelId) || [];
  activities.push({ botId, timestamp: now });

  // Prune old entries
  const cutoff = now - ACTIVITY_WINDOW_MS;
  const pruned = activities.filter((a) => a.timestamp > cutoff);
  recentChannelActivity.set(channelId, pruned);

  debug(`Recorded bot activity in ${channelId}:${botId}`);
}

export function getLastBotActivity(channelId: string, botId: string): number {
  return lastBotActivityByChannelAndBot.get(`${channelId}:${botId}`) || 0;
}

/**
 * Get all recent bot activity in a channel since a given timestamp.
 * Used for crosstalk detection - check if ANY bot posted during wait period.
 */
export function getRecentChannelActivity(
  channelId: string,
  since: number
): { botId: string; timestamp: number }[] {
  const activities = recentChannelActivity.get(channelId) || [];
  return activities.filter((a) => a.timestamp > since);
}

// For tests
export function clearBotActivity(channelId?: string): void {
  if (channelId) {
    for (const key of Array.from(lastBotActivityByChannelAndBot.keys())) {
      if (key.startsWith(`${channelId}:`)) {
        lastBotActivityByChannelAndBot.delete(key);
      }
    }
    recentChannelActivity.delete(channelId);
    return;
  }
  lastBotActivityByChannelAndBot.clear();
  recentChannelActivity.clear();
}
