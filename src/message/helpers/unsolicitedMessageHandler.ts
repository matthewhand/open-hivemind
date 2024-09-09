import { ConfigurationManager } from '@config/ConfigurationManager';

/**
 * Determines whether to reply to an unsolicited message, integrating the bot activity tracking.
 * 
 * @param {any} msg - The Discord message object.
 * @param {string} botId - The ID of the bot.
 * @param {string} integration - The name of the integration (e.g., 'discord').
 * @returns {boolean} - Whether to respond or not.
 */
export function shouldReplyToUnsolicitedMessage(msg: any, botId: string, integration: string): boolean {
  const channelId = msg.getChannelId();
  const configManager = ConfigurationManager.getInstance();

  // Check if the bot has previously spoken in this channel
  const botSpokenBefore = configManager.getSession(integration, channelId);

  // Check if the message is a direct query (contains @botId or is a reply)
  const isDirectQuery = msg.isMentioning(botId) || msg.isReply();

  // If bot has never spoken in the channel and it's not a direct query, don't reply
  if (!botSpokenBefore && !isDirectQuery) {
    return false;
  }

  // If responding, mark the bot as having spoken in the channel
  if (!botSpokenBefore) {
    configManager.setSession(integration, channelId, 'active');
  }

  return true;
}
