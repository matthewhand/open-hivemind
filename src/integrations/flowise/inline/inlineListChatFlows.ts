import { IMessage } from '@src/message/interfaces/IMessage';
import { flowiseListChatFlows } from '@integrations/flowise/shared/flowiseListChatFlows';
import { sendMessageToChannel } from '@src/integrations/discord/channel/sendMessageToChannel';
import Debug from 'debug';
import { Client } from 'discord.js';

const debug = Debug('app:flowise');

/**
 * Handles the inline command to list Flowise chat flows (!flowise:listChatFlows).
 * @param {IMessage} msg - The original message object.
 * @returns {Promise<void>} Sends the chat flows to the same channel.
 */
export const handleInlineListChatFlows = async (client: Client, msg: IMessage): Promise<void> => {
  const chatFlows = await flowiseListChatFlows();
  debug('Sending Flowise chat flows:', chatFlows);  // Improvement: Debug log
  // Fix: Replace msg.reply with sendMessageToChannel with correct arguments
  await sendMessageToChannel(client, msg.getChannelId(), chatFlows);
};
