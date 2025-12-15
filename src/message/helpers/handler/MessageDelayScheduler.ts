import Debug from 'debug';
import messageConfig from '@config/messageConfig';

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
    useThread: boolean
  ): Promise<void> {
    const minDelayRaw = messageConfig.get('MESSAGE_MIN_DELAY') || 1000;
    const delayScaleRaw = messageConfig.get('MESSAGE_DELAY_MULTIPLIER');
    const delayScale = typeof delayScaleRaw === 'number' ? delayScaleRaw : Number(delayScaleRaw) || 1;
    const minDelay = (typeof minDelayRaw === 'number' ? minDelayRaw : Number(minDelayRaw) || 1000) * delayScale;
    await new Promise(resolve => setTimeout(resolve, minDelay));
    await sendFn(text);
    debug(`Scheduled message in channel ${channelId} for user ${userId}: ${text}`);
  }
}

export default MessageDelayScheduler;
module.exports = MessageDelayScheduler; // For CommonJS compatibility
