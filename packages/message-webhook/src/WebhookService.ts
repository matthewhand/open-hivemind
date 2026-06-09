import {
  http,
  isHttpError,
  type IMessage,
  type IMessengerService,
  type IServiceDependencies,
} from '@hivemind/shared-types';

/** Default timeout for outbound webhook deliveries, in milliseconds. */
const DEFAULT_OUTBOUND_TIMEOUT_MS = 10_000;

/**
 * Webhook implementation of IMessengerService.
 *
 * This service provides a way to receive and send messages via standard
 * HTTP webhooks. It is useful for integrating with custom apps or platforms
 * that aren't natively supported.
 *
 * Outgoing messages are POSTed to a configured outbound URL, resolved (in
 * priority order) from the per-bot config (`webhook.url` / `WEBHOOK_URL` via
 * the injected `getBotConfig`), the service config (`outboundUrl` /
 * `WEBHOOK_URL`), or the `WEBHOOK_URL` environment variable.
 */
export class WebhookService implements IMessengerService {
  private messageHandler?: (
    message: IMessage,
    history: IMessage[],
    botConfig: any
  ) => Promise<string>;
  public providerName = 'webhook';

  constructor(
    private dependencies?: IServiceDependencies,
    private config?: Record<string, any>
  ) {}

  async initialize(): Promise<void> {
    // Initialization logic for webhook service (e.g., verifying config)
    return Promise.resolve();
  }

  /** Resolves the per-bot webhook sub-config (if a bot config accessor is available). */
  private getBotWebhookConfig(senderName?: string): Record<string, any> {
    if (!senderName || typeof this.dependencies?.getBotConfig !== 'function') {
      return {};
    }
    try {
      const botConfig = this.dependencies.getBotConfig(senderName) as Record<string, any> | null;
      if (!botConfig) {
        return {};
      }
      const nested = botConfig.webhook;
      return {
        url: nested?.url ?? nested?.outboundUrl ?? botConfig.WEBHOOK_URL,
        token: nested?.token ?? botConfig.WEBHOOK_TOKEN,
        timeoutMs: nested?.timeoutMs,
      };
    } catch {
      return {};
    }
  }

  /** Resolves the outbound URL: per-bot config → service config → WEBHOOK_URL env. */
  private resolveOutboundUrl(senderName?: string): string {
    const botCfg = this.getBotWebhookConfig(senderName);
    return String(
      botCfg.url ||
        this.config?.outboundUrl ||
        this.config?.WEBHOOK_URL ||
        this.config?.url ||
        process.env.WEBHOOK_URL ||
        ''
    ).trim();
  }

  /** Resolves the optional bearer token sent with outbound deliveries. */
  private resolveOutboundToken(senderName?: string): string {
    const botCfg = this.getBotWebhookConfig(senderName);
    return String(
      botCfg.token || this.config?.WEBHOOK_TOKEN || process.env.WEBHOOK_TOKEN || ''
    ).trim();
  }

  /** Resolves the delivery timeout in milliseconds. */
  private resolveTimeoutMs(senderName?: string): number {
    const botCfg = this.getBotWebhookConfig(senderName);
    const raw = Number(botCfg.timeoutMs ?? this.config?.timeoutMs ?? NaN);
    return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_OUTBOUND_TIMEOUT_MS;
  }

  /**
   * Delivers a message by POSTing it to the configured outbound webhook URL.
   *
   * @returns The delivery id reported by the receiver (`id` / `messageId` /
   *   `message_id` in the JSON response) or a generated `webhook-delivered-*`
   *   id when the receiver does not return one.
   * @throws When no outbound URL is configured, the receiver responds with a
   *   non-2xx status, or the request times out.
   */
  async sendMessageToChannel(
    channelId: string,
    message: string,
    senderName?: string,
    threadId?: string
  ): Promise<string> {
    const url = this.resolveOutboundUrl(senderName);
    if (!url) {
      throw new Error(
        'Webhook outbound URL is not configured. Set WEBHOOK_URL (env or provider config) ' +
          'or a per-bot webhook.url to enable outgoing webhook delivery.'
      );
    }

    const token = this.resolveOutboundToken(senderName);
    const timeout = this.resolveTimeoutMs(senderName);

    const payload = {
      channelId,
      text: message,
      sender: senderName ?? this.providerName,
      threadId: threadId ?? null,
      timestamp: new Date().toISOString(),
    };

    try {
      const response = await http.post<any>(url, payload, {
        timeout,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      const deliveryId =
        response && typeof response === 'object'
          ? (response.id ?? response.messageId ?? response.message_id)
          : undefined;
      return deliveryId !== undefined && deliveryId !== null
        ? String(deliveryId)
        : `webhook-delivered-${Date.now()}`;
    } catch (error: unknown) {
      if (isHttpError(error)) {
        throw new Error(`Webhook delivery to ${url} failed: ${error.message}`);
      }
      const err = error as Error;
      if (err?.name === 'AbortError' || /abort/i.test(err?.message || '')) {
        throw new Error(`Webhook delivery to ${url} timed out after ${timeout}ms`);
      }
      throw new Error(`Webhook delivery to ${url} failed: ${err?.message ?? String(error)}`);
    }
  }

  async getMessagesFromChannel(channelId: string, limit?: number): Promise<IMessage[]> {
    // Webhooks are push-based: there is no upstream history endpoint to poll,
    // so fetching messages from a "channel" intentionally yields an empty list.
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
