import { ConfigurationManager } from '@config/ConfigurationManager';

/**
 * Sets the chat flow for a specific channel and persists the configuration.
 * @param {string} channelId - The ID of the channel.
 * @param {string} chatFlow - The chat flow ID to set for the channel.
 * @returns {Promise<string>} Confirmation message.
 */
export const flowiseSetChatFlow = async (channelId: string, chatFlow: string): Promise<string> => {
  const configManager = ConfigurationManager.getInstance();
  configManager.setSession('flowise', channelId, chatFlow);
  return `Chat flow set to ${chatFlow} for this channel.`;
};
