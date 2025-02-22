const shouldDebug = require('debug')('app:shouldReplyToMessage');
const msgConfig = require('@message/interfaces/messageConfig');

const channelsWithBotInteraction = new Map<string, number>();

let recentActivityDecayRate = Number(msgConfig.get('MESSAGE_RECENT_ACTIVITY_DECAY_RATE') || 0);
let activityTimeWindow = msgConfig.get('MESSAGE_ACTIVITY_TIME_WINDOW');

function setDecayConfig(newDecayRate: number, newTimeWindow: number): void {
  recentActivityDecayRate = newDecayRate;
  activityTimeWindow = newTimeWindow;
  shouldDebug(`Updated decay config: rate = ${recentActivityDecayRate}, window = ${activityTimeWindow}ms`);
}

function markChannelAsInteracted(channelId: string): void {
  channelsWithBotInteraction.set(channelId, Date.now());
  shouldDebug(`Channel ${channelId} marked as interacted at ${Date.now()}.`);
}

function shouldReplyToMessage(message: { getChannelId: () => string }, botId: string, platform: string): boolean {
  if (process.env.FORCE_REPLY && process.env.FORCE_REPLY.toLowerCase() === 'true') {
    shouldDebug('FORCE_REPLY env var enabled. Forcing reply.');
    return true;
  }

  const channelId = message.getChannelId();
  shouldDebug(`Evaluating message in channel: ${channelId}`);

  const lastInteractionTime = channelsWithBotInteraction.get(channelId) || 0;
  const timeSinceLastActivity = Date.now() - lastInteractionTime;
  shouldDebug(`Time since last activity: ${timeSinceLastActivity}ms`);

  let chance = 0.2;
  shouldDebug(`Initial base chance: ${chance}`);

  const decayFactor = Math.max(
    0.5,
    Math.exp(-recentActivityDecayRate * (timeSinceLastActivity / activityTimeWindow))
  );
  chance *= decayFactor;
  shouldDebug(`Chance after decay: ${chance} (decay factor: ${decayFactor})`);

  const decision = Math.random() < chance;
  shouldDebug(`Decision: ${decision} (chance = ${chance})`);

  return decision;
}

function getMinIntervalMs(): number {
  return Number(msgConfig.get('MESSAGE_MIN_INTERVAL_MS') || 1000);
}

module.exports = {
  setDecayConfig,
  markChannelAsInteracted,
  shouldReplyToMessage,
  getMinIntervalMs
};
