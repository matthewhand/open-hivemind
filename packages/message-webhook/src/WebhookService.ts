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
   */
  async handleIncomingWebhook(payload: any): Promise<string> {
    if (!this.messageHandler) return 'No handler';
    
    // Convert raw webhook payload to IMessage and call handler
    // This is a simplified stub.
    return 'Handled';
  }
}
