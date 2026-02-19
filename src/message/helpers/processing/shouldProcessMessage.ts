import messageConfig from '@config/messageConfig';
import type { IMessage } from '@message/interfaces/IMessage';

/**
 * Returns the minimum interval in milliseconds for processing messages.
 * If the configuration key MESSAGE_MIN_INTERVAL_MS is not set, defaults to 1000.
 */
export function getMinIntervalMs(): number {
  try {
    const value = messageConfig.get('MESSAGE_MIN_INTERVAL_MS');
    const numValue = typeof value === 'number' ? value : Number(value) || 1000;
    return isNaN(numValue) ? 1000 : numValue;
  } catch {
    // If config access fails, return default
    return 1000;
  }
}

/**
 * Gets the default channel ID from the appropriate config based on provider.
 */
function getDefaultChannelId(): string {
  try {
    // Try Discord config first
    const discordConfig = require('@config/discordConfig').default;
    const discordChannel = discordConfig?.get?.('DISCORD_DEFAULT_CHANNEL_ID');
    if (discordChannel) {return discordChannel;}
  } catch { }

  try {
    // Try Slack config
    const slackConfig = require('@config/slackConfig').default;
    const slackChannel = slackConfig?.get?.('SLACK_DEFAULT_CHANNEL_ID');
    if (slackChannel) {return slackChannel;}
  } catch { }

  return '';
}

/**
 * Determines if a message should be processed based on its content and sender.
 *
 * @param message - The message to evaluate.
 * @returns `true` if the message should be processed, `false` otherwise.
 */
export function shouldProcessMessage(message: IMessage): boolean {
  try {
    // Handle null/undefined messages
    if (!message) {
      return false;
    }

    const text = message.getText();
    if (!text || text.trim().length === 0) {
      return false;
    }

    // Check if this is a bot message
    if (message.isFromBot()) {
      let ignoreBots = false;
      let limitToDefaultChannel = true;

      try {
        ignoreBots = Boolean(messageConfig.get('MESSAGE_IGNORE_BOTS'));
      } catch {
        ignoreBots = false; // Default: don't ignore bots
      }

      try {
        const limitConfig = messageConfig.get('MESSAGE_BOT_REPLIES_LIMIT_TO_DEFAULT_CHANNEL');
        limitToDefaultChannel = limitConfig === undefined ? true : Boolean(limitConfig);
      } catch {
        limitToDefaultChannel = true; // Default: limit to default channel
      }

      // If ignoring all bots, reject
      if (ignoreBots) {
        return false;
      }

      // If limiting bot replies to default channel, check channel
      if (limitToDefaultChannel) {
        const defaultChannelId = getDefaultChannelId();
        const messageChannelId = message.getChannelId();
        if (!defaultChannelId || messageChannelId !== defaultChannelId) {
          return false;
        }
      }
    }

    return true;
  } catch {
    // If message methods throw, don't process the message
    return false;
  }
}
