import { IMessage } from '@src/message/interfaces/IMessage';
import { flowiseSetChatFlow } from '@integrations/flowise/shared/flowiseSetChatFlow';
import { sendMessageToChannel } from '@src/integrations/discord/channel/sendMessageToChannel';
import { Client } from 'discord.js';
import Debug from 'debug';

const debug = Debug('app:flowise');

// Basic message formatting function
const formatMessage = (message: any): string => {
  return Array.isArray(message) ? message.join('\n') : JSON.stringify(message, null, 2);
};

/**
 * Handles the inline command to set the Flowise chat flow (!flowise:setChatFlow).
 * @param {IMessage} msg - The original message object.
 * @param {string} chatFlow - The chat flow ID to set.
 * @returns {Promise<void>} Sends the confirmation message to the same channel.
 */
export const handleInlineSetChatFlow = async (client: Client, msg: IMessage, chatFlow: string): Promise<void> => {
  const channelId = msg.getChannelId();
  const response = await flowiseSetChatFlow(channelId, chatFlow);
  const formattedResponse = formatMessage(response);  // Use basic formatting
  debug('Flowise set chat flow response:', formattedResponse);  // Improvement: Debug log
  // Fix: Replace msg.reply with sendMessageToChannel
  await sendMessageToChannel(client, channelId, formattedResponse);
};
