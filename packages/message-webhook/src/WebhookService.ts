import type {
  IMessengerService,
  IMessage,
  IServiceDependencies,
} from '@hivemind/shared-types';

/**
 * Webhook implementation of IMessengerService.
 *
 * This service provides a way to receive and send messages via standard
 * HTTP webhooks. It is useful for integrating with custom apps or platforms
 * that aren't natively supported.
 */
export class WebhookService implements IMessengerService {
  private messageHandler?: (message: IMessage, history: IMessage[], botConfig: any) => Promise<string>;
  public providerName = 'webhook';

  constructor(private dependencies?: IServiceDependencies) {}

  async initialize(): Promise<void> {
    // Initialization logic for webhook service (e.g., verifying config)
    return Promise.resolve();
  }

  async sendMessageToChannel(
    channelId: string,
    message: string,
    senderName?: string,
    threadId?: string
  ): Promise<string> {
    // Implementation for sending a message via an outgoing webhook
    // This would typically involve an HTTP POST request to the configured URL
    return `webhook-msg-${Date.now()}`;
  }

  async getMessagesFromChannel(channelId: string, limit?: number): Promise<IMessage[]> {
    // Webhooks are usually push-based, so "getting messages" from a channel
    // might return an empty list or the last received message.
    return [];
  }

  async sendPublicAnnouncement(channelId: string, announcement: any): Promise<void> {
    await this.sendMessageToChannel(channelId, JSON.stringify(announcement));
  }

  getClientId(): string {
    return 'webhook-client';
  }

  getDefaultChannel(): string {
    return 'default-webhook-channel';
  }

  async shutdown(): Promise<void> {
    return Promise.resolve();
  }

  setMessageHandler(
    handler: (message: IMessage, history: IMessage[], botConfig: any) => Promise<string>
  ): void {
    this.messageHandler = handler;
  }

  /**
   * Method called by the webhook route handler when an incoming request is received.
   * Supports both generic and Slack-formatted payloads.
   */
  async handleIncomingWebhook(payload: any, channelId?: string): Promise<string> {
    if (!this.messageHandler) {
      return 'No message handler registered';
    }

    let text = payload.text || payload.message || payload.content || '';

    // Handle Slack attachments if present
    if (payload.attachments && Array.isArray(payload.attachments)) {
      const attachmentText = payload.attachments
        .map((a: any) => a.text || a.fallback || '')
        .filter(Boolean)
        .join('\n');

      if (attachmentText) {
        text = text ? `${text}\n${attachmentText}` : attachmentText;
      }
    }

    if (!text) {
      return 'No text content found in payload';
    }

    // Mapping Slack 'username' to author name (already supported, but kept for clarity)
    const userId = payload.userId || payload.user || 'webhook-user';
    const userName = payload.userName || payload.username || 'Webhook User';
    const effectiveChannelId =
      channelId || payload.channelId || payload.channel || this.getDefaultChannel();

    // Construct a minimal IMessage-compatible object
    const mockMessage: IMessage = {
      getText: () => text,
      getAuthorId: () => userId,
      getAuthorName: () => userName,
      getChannelId: () => effectiveChannelId,
      getTimestamp: () => new Date(),
      isFromBot: () => false,
      platform: 'webhook',
      raw: payload,
    } as any;

    try {
      // Trigger the handler (which usually emits to the pipeline bus)
      const response = await this.messageHandler(mockMessage, [], {});
      return response || 'Processed';
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return `Error processing webhook message: ${msg}`;
    }
  }
}
