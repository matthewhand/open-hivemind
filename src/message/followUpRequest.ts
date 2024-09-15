// Correcting argument mismatch and aligning follow-up request logic.
import { IMessage } from '@src/message/interfaces/IMessage';
import { sendFollowUpRequest } from '@src/message/helpers/handler/sendFollowUpRequest';

export async function followUpRequest(message: IMessage, channelId: string, followUpText: string): Promise<void> {
  try {
    await sendFollowUpRequest(message, channelId, followUpText);
  } catch (error) {
    console.error('Error in follow-up request:', error);
  }
}
