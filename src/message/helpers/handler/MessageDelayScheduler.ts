import Debug from 'debug';
import messageConfig from '@config/messageConfig';
import { getMessageSetting } from '../processing/ResponseProfile';

const debug = Debug('app:MessageDelayScheduler');

class MessageDelayScheduler {
  private static instance: MessageDelayScheduler;
  private constructor() {
    // Private constructor to enforce singleton
    debug('Loaded schedulerMsgConfig:', messageConfig);
  }

  // Singleton instance getter
  public static getInstance(): MessageDelayScheduler {
    if (!MessageDelayScheduler.instance) {
      MessageDelayScheduler.instance = new MessageDelayScheduler();
    }
    return MessageDelayScheduler.instance;
  }

  // Example method (adjust as needed based on actual usage)
  public async scheduleMessage(
    channelId: string,
    messageId: string,
    text: string,
    userId: string,
    sendFn: (text: string, threadId?: string) => Promise<string>,
    useThread: boolean,
    botConfig?: Record<string, any>
  ): Promise<void> {
    const minDelayRaw = getMessageSetting('MESSAGE_MIN_DELAY', botConfig) || 1000;
    const delayScaleRaw = getMessageSetting('MESSAGE_DELAY_MULTIPLIER', botConfig);
    const delayScale =
      typeof delayScaleRaw === 'number' ? delayScaleRaw : Number(delayScaleRaw) || 1;
    const minDelay =
      (typeof minDelayRaw === 'number' ? minDelayRaw : Number(minDelayRaw) || 1000) * delayScale;
    await new Promise((resolve) => setTimeout(resolve, minDelay));
    await sendFn(text);
    debug(`Scheduled message in channel ${channelId} for user ${userId}: ${text}`);
  }
}

export default MessageDelayScheduler;
module.exports = MessageDelayScheduler; // For CommonJS compatibility
