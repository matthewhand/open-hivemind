import { IMessage } from '@src/message/interfaces/IMessage';
import { flowiseListChatFlows } from '@integrations/flowise/shared/flowiseListChatFlows';

/**
 * Handles the inline command to list Flowise chat flows (!flowise:listChatFlows).
 * @param {IMessage} msg - The original message object.
 * @returns {Promise<void>} Sends the chat flows as a message reply.
 */
export const handleInlineListChatFlows = async (msg: IMessage): Promise<void> => {
  const chatFlows = await flowiseListChatFlows();
  await msg.reply(chatFlows);
};
