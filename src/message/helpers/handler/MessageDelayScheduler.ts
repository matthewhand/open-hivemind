import Debug from 'debug';
import { IMessage } from '@src/message/interfaces/IMessage';
import messageConfig from '@src/config/messageConfig';
import { ILlmProvider } from '@src/llm/interfaces/ILlmProvider';
import { getMessageProvider } from '@src/message/management/getMessageProvider';

const debug = Debug('app:MessageDelayScheduler');
const messageProvider = getMessageProvider();

export class MessageDelayScheduler {
  private static instance: MessageDelayScheduler;
  private maxDelay: number;
  private minDelay: number;
  private decayRate: number;
  private rateLimitPerChannel: number;
  private calmWindow: number;
  private typingInterval: number = 2000; // Send typing every 2s
  private messageTimestamps: Record<string, number[]> = {};
  private messageQueues: Record<string, { messages: IMessage[]; timeout?: NodeJS.Timeout; typingInterval?: NodeJS.Timeout }> = {};

  public static getInstance(): MessageDelayScheduler {
    if (!MessageDelayScheduler.instance) {
      debug('Creating new instance of MessageDelayScheduler');
      MessageDelayScheduler.instance = new MessageDelayScheduler();
    }
    return MessageDelayScheduler.instance;
  }

  private constructor() {
    this.maxDelay = messageConfig.get('MESSAGE_MAX_DELAY') || 10000;
    this.minDelay = messageConfig.get('MESSAGE_MIN_DELAY') || 1000;
    this.decayRate = messageConfig.get('MESSAGE_DECAY_RATE') || -0.5;
    this.rateLimitPerChannel = messageConfig.get('MESSAGE_RATE_LIMIT_PER_CHANNEL') || 5;
    this.calmWindow = messageConfig.get('MESSAGE_CALM_WINDOW') || 2000;
  }

  public logIncomingMessage(channelId: string, message: IMessage): void {
    const currentTime = Date.now();
    if (!this.messageQueues[channelId]) {
      this.messageQueues[channelId] = { messages: [] };
    }
    this.messageQueues[channelId].messages.push(message);
    debug(`Channel ${channelId} logged message at ${currentTime}: ${message.getText()}`);
  }

  private calculateDelay(channelId: string, messageContent: string, processingTime: number): number {
    const currentTime = Date.now();
    const queue = this.messageQueues[channelId] || { messages: [] };
    const timeSinceLast = queue.messages.length > 1 ? 
      currentTime - queue.messages[queue.messages.length - 2].getTimestamp().getTime() : 1000;
    const sizeMultiplier = Math.max(1, messageContent.length / 50);
    let delay = Math.exp(this.decayRate * timeSinceLast / 1000) * this.maxDelay;
    delay = Math.min(Math.max(delay, this.minDelay), this.maxDelay) * sizeMultiplier - processingTime;
    return Math.max(delay, this.minDelay);
  }

  private isRateLimited(channelId: string): boolean {
    const currentTime = Date.now();
    this.messageTimestamps[channelId] = this.messageTimestamps[channelId]?.filter(ts => currentTime - ts <= 60000) || [];
    return this.messageTimestamps[channelId].length >= this.rateLimitPerChannel;
  }

  private recordMessageTimestamp(channelId: string): void {
    const currentTime = Date.now();
    if (!this.messageTimestamps[channelId]) this.messageTimestamps[channelId] = [];
    this.messageTimestamps[channelId].push(currentTime);
    this.messageTimestamps[channelId] = this.messageTimestamps[channelId].filter(ts => currentTime - ts <= 60000);
  }

  private async sendTypingIndicator(channelId: string): Promise<void> {
    try {
      if (messageConfig.get('MESSAGE_PROVIDER') === 'slack') {
        const botInfo = (await import('../integrations/slack/SlackBotManager')).default.getInstance().getBotByName('Jeeves');
        if (botInfo?.webClient) {
          await botInfo.webClient.chat.postEphemeral({
            channel: channelId,
            user: 'any', // Placeholder; Slack requires a user ID
            text: 'Typing...',
          });
        }
      } else if (messageConfig.get('MESSAGE_PROVIDER') === 'discord') {
        const channel = await (await import('../integrations/discord/DiscordService')).default.getInstance().client.channels.fetch(channelId);
        if (channel?.isText()) await channel.sendTyping();
      }
      debug(`Sent typing indicator to channel ${channelId}`);
    } catch (error) {
      debug(`Failed to send typing indicator: ${(error as Error).message}`);
    }
  }

  public scheduleMessage(
    channelId: string,
    initialMessage: IMessage,
    processingTime: number,
    sendFunction: (message: string) => Promise<void>,
    llmProvider: ILlmProvider
  ): void {
    if (this.isRateLimited(channelId)) {
      debug(`Channel ${channelId} rate-limited. Message not scheduled.`);
      return;
    }

    this.logIncomingMessage(channelId, initialMessage);
    const queue = this.messageQueues[channelId];

    if (queue.timeout) {
      clearTimeout(queue.timeout);
      debug(`Cleared previous timeout for channel ${channelId}`);
    }
    if (queue.typingInterval) {
      clearInterval(queue.typingInterval); // Clear previous typing interval
    }

    // Start typing indicator loop
    queue.typingInterval = setInterval(() => this.sendTypingIndicator(channelId), this.typingInterval);

    queue.timeout = setTimeout(async () => {
      try {
        clearInterval(queue.typingInterval); // Stop typing when responding
        const aggregatedText = queue.messages.map(msg => msg.getText()).join(' ');
        const history = []; // Could fetch history if needed
        const response = await llmProvider.generateChatCompletion(aggregatedText, history);
        const textContent = typeof response === 'object' && response !== null ? response.text || '' : response;
        const delay = this.calculateDelay(channelId, textContent, processingTime);

        setTimeout(async () => {
          await sendFunction(textContent);
          this.recordMessageTimestamp(channelId);
          delete this.messageQueues[channelId]; // Clear queue
          debug(`Sent aggregated response to ${channelId}: ${textContent}`);
        }, delay);
      } catch (error) {
        debug(`Error processing aggregated message: ${(error as Error).message}`);
        clearInterval(queue.typingInterval); // Clean up on error
      }
    }, this.calmWindow); // Reset timer with each new message
  }
}
