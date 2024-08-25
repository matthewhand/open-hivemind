import { IMessage } from '@src/message/interfaces/IMessage';
import { sendFollowUp } from './sendFollowUp';

export async function followUpRequest(message: IMessage, channelId: string, topic: string): Promise<void> {
  try {
    await sendFollowUp(message, channelId, topic);
  } catch (error: any) {
    console.error('[followUpRequest] Error sending follow-up request:', error);
  }
}
