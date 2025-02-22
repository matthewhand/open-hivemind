const utilsDebug = require('debug')('app:messageUtils');
const utilsConfig = require('@message/interfaces/messageConfig');
const shouldReplyToMessage = require('./processing/shouldReplyToMessage');

const channelsWithBotInteraction = new Map();
let recentActivityDecayRate = Number(utilsConfig.get('MESSAGE_RECENT_ACTIVITY_DECAY_RATE') || 0);
let activityTimeWindow = utilsConfig.get('MESSAGE_ACTIVITY_TIME_WINDOW');

function setDecayConfig(newDecayRate: number, newTimeWindow: number) {
  recentActivityDecayRate = newDecayRate;
  activityTimeWindow = newTimeWindow;
  utilsDebug(`Updated decay config: rate = ${recentActivityDecayRate}, window = ${activityTimeWindow}ms`);
}

function markChannelAsInteracted(channelId: string) {
  channelsWithBotInteraction.set(channelId, Date.now());
  utilsDebug(`Channel ${channelId} marked as interacted at ${Date.now()}.`);
}

module.exports = {
  setDecayConfig,
  markChannelAsInteracted,
  shouldReplyToMessage,
  channelsWithBotInteraction,
  recentActivityDecayRate,
  activityTimeWindow
};
