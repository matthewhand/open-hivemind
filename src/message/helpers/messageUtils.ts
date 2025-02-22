const utilsDebug = require('debug')('app:messageUtils');
const utilsConfig = require('@message/interfaces/messageConfig');

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

function shouldReplyToMessage(message: any, botId: string, platform: string) {
  if (process.env.FORCE_REPLY && process.env.FORCE_REPLY.toLowerCase() === 'true') {
    utilsDebug('FORCE_REPLY env var enabled. Forcing reply.');
    return true;
  }

  const channelId = message.getChannelId();
  const text = message.getText();
  utilsDebug(`Evaluating message in channel: ${channelId}, platform: ${platform}, content: "${text}"`);

  const lastInteractionTime = channelsWithBotInteraction.get(channelId) || 0;
  const timeSinceLastActivity = Date.now() - lastInteractionTime;
  utilsDebug(`Time since last activity: ${timeSinceLastActivity}ms`);

  let chance = 0.2;
  utilsDebug(`Initial base chance: ${chance}`);

  chance = applyModifiers(message, botId, chance, text);
  if (chance >= 1) {
    utilsDebug('Chance is 1 or greater, will reply.');
    return true;
  }
  if (chance <= 0) {
    utilsDebug('Chance is 0 or less, will not reply.');
    return false;
  }

  const decayFactor = Math.max(
    0.5,
    Math.exp(-recentActivityDecayRate * (timeSinceLastActivity / activityTimeWindow))
  );
  chance *= decayFactor;
  utilsDebug(`Chance after decay: ${chance} (decay factor: ${decayFactor})`);

  const decision = Math.random() < chance;
  utilsDebug(`Decision: ${decision} (chance = ${chance})`);
  return decision;
}

function applyModifiers(message: any, botId: string, chance: number, text: string): number {
  if (!text) {
    utilsDebug('No message content, setting chance to 0.');
    return 0;
  }

  const wakewordsRaw = utilsConfig.get('MESSAGE_WAKEWORDS');
  const wakewords = Array.isArray(wakewordsRaw) ? wakewordsRaw : String(wakewordsRaw).split(',');
  if (wakewords.some(word => text.startsWith(word.trim()))) {
    utilsDebug(`Wakeword detected. Chance set to 1.`);
    return 1;
  }

  if (/[!?]/.test(text.slice(-1))) {
    const interrobangBonus = Number(utilsConfig.get('MESSAGE_INTERROBANG_BONUS') || 0.3);
    chance += interrobangBonus;
    utilsDebug(`Interrobang detected. Applied bonus: ${interrobangBonus}. New chance: ${chance}`);
  }

  if (message.isFromBot()) {
    const botModifier = Number(utilsConfig.get('MESSAGE_BOT_RESPONSE_MODIFIER') || -1.0);
    chance += botModifier;
    utilsDebug(`Message from another bot. Applied modifier: ${botModifier}. New chance: ${chance}`);
  }

  return chance;
}

module.exports = {
  setDecayConfig,
  markChannelAsInteracted,
  shouldReplyToMessage,
  channelsWithBotInteraction,
  recentActivityDecayRate,
  activityTimeWindow
};
