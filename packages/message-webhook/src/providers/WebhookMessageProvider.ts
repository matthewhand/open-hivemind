import type { IMessage } from '@hivemind/shared-types';

/**
 * Webhook-specific message provider that implements the low-level message transport interface.
 */
export class WebhookMessageProvider {
  /**
   * Retrieves messages from a webhook "channel".
   *
   * @param channelId - The webhook channel ID to fetch messages from
   * @returns Promise resolving to an array of IMessage objects
   */
  public async getMessages(channelId: string): Promise<IMessage[]> {
    // Standard implementation: webhooks are typically push-only
    return [];
  }

  public async getForumOwner(forumId: string): Promise<string> {
    return '';
  }
}
