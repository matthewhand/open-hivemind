// import Debug from 'debug';
import slackConfig from '@config/slackConfig';

// const _debug = Debug('app:SlackService:ChannelManager');

/**
 * Utility class for managing Slack channel operations
 */
export class SlackChannelManager {
  /**
   * Get the default channel ID from configuration
   */
  public static getDefaultChannel(): string {
    return slackConfig.get('SLACK_DEFAULT_CHANNEL_ID') || '';
  }

  /**
   * Validate a Slack channel ID format
   */
  public static isValidChannelId(channelId: string): boolean {
    // Slack channel IDs start with 'C' for public channels, 'G' for private groups, 'D' for DMs
    return /^[CGD][A-Z0-9]{8,}$/.test(channelId);
  }

  /**
   * Check if a channel should be joined based on configuration
   */
  public static shouldJoinChannel(channelId: string, joinChannels?: string): boolean {
    if (!joinChannels) return false;

    const channels = joinChannels.split(',').map(c => c.trim());
    return channels.includes(channelId) || channels.includes('*');
  }

  /**
   * Parse join channels configuration
   */
  public static parseJoinChannels(joinChannels?: string): string[] {
    if (!joinChannels) return [];

    return joinChannels.split(',')
      .map(c => c.trim())
      .filter(c => c.length > 0);
  }

  /**
   * Format channel mention for Slack
   */
  public static formatChannelMention(channelId: string): string {
    return `<#${channelId}>`;
  }

  /**
   * Format user mention for Slack
   */
  public static formatUserMention(userId: string): string {
    return `<@${userId}>`;
  }

  /**
   * Extract channel ID from Slack channel mention
   */
  public static extractChannelId(mention: string): string | null {
    const match = mention.match(/^<#([^|>]+)(?:\|[^>]+)?>$/);
    return match ? match[1] : null;
  }

  /**
   * Extract user ID from Slack user mention
   */
  public static extractUserId(mention: string): string | null {
    const match = mention.match(/^<@([^|>]+)(?:\|[^>]+)?>$/);
    return match ? match[1] : null;
  }
}