import { IMessengerService } from '@src/message/interfaces/IMessengerService';
import { IMessage } from '@src/message/interfaces/IMessage';

/**
 * Generic function to send a reply using the IMessengerService interface.
 * Looks up the original channel or DM ID and sends the response.
 * 
 * @param messengerService - The IMessengerService to handle the response.
 * @param originalMessage - The original IMessage object.
 * @param response - The response content to send.
 */
export const sendReply = async (
  messengerService: IMessengerService,
  originalMessage: IMessage,
  response: string
): Promise<void> => {
  const channelId = originalMessage.getChannelId();  // Lookup channel/DM ID from original message
  await messengerService.sendMessageToChannel(channelId, response);  // Send response
};
