import { IMessage } from '@src/message/interfaces/IMessage';
import { flowiseSetChatFlow } from '@integrations/flowise/shared/flowiseSetChatFlow';

/**
 * Handles the inline command to set the Flowise chat flow (!flowise:setChatFlow).
 * @param {IMessage} msg - The original message object.
 * @param {string} chatFlow - The chat flow ID to set.
 * @returns {Promise<void>} Confirmation message reply.
 */
export const handleInlineSetChatFlow = async (msg: IMessage, chatFlow: string): Promise<void> => {
  const channelId = msg.getChannelId();
  const response = await flowiseSetChatFlow(channelId, chatFlow);
  await msg.reply(response);
};
