import Debug from 'debug';
import BotConfigurationManager from '@src/config/BotConfigurationManager';
import slackConfig from '@config/slackConfig';

const debug = Debug('app:SlackService:ConfigurationLoader');

export interface SlackBotInstance {
  token: string;
  signingSecret: string;
  name: string;
  appToken?: string;
  defaultChannelId?: string;
  joinChannels?: string;
}

export interface LegacySlackConfig {
  instances: SlackBotInstance[];
  mode: 'socket' | 'rtm';
}

/**
 * Handles loading and parsing Slack configuration from multiple sources
 */
export class SlackConfigurationLoader {
  /**
   * Load Slack bot configurations from BotConfigurationManager
   */
  public static loadFromBotConfigurationManager(): SlackBotInstance[] {
    const configManager = BotConfigurationManager.getInstance();
    const slackBotConfigs = configManager
      .getAllBots()
      .filter((bot) => bot.messageProvider === 'slack' && bot.slack?.botToken);

    if (slackBotConfigs.length === 0) {
      debug('No Slack bot configurations found in BotConfigurationManager');
      return [];
    }

    debug(`Loading ${slackBotConfigs.length} Slack bot configurations`);

    return slackBotConfigs.map((botConfig) => ({
      token: botConfig.slack!.botToken,
      signingSecret: botConfig.slack!.signingSecret || '',
      name: botConfig.name,
      appToken: botConfig.slack!.appToken,
      defaultChannelId: botConfig.slack!.defaultChannelId,
      joinChannels: botConfig.slack!.joinChannels,
    }));
  }

  /**
   * Load legacy configuration from environment variables and config files
   */
  public static loadLegacyConfiguration(): {
    instances: SlackBotInstance[];
    mode: 'socket' | 'rtm';
  } {
    const instances: SlackBotInstance[] = [];
    const mode: 'socket' | 'rtm' = 'socket'; // Default to socket mode

    try {
      // Try to load from config file first
      this.loadFromConfigFile(instances, mode);

      // Fallback to environment variables for single-bot legacy setup
      if (instances.length === 0 && process.env.SLACK_BOT_TOKEN) {
        instances.push({
          token: String(process.env.SLACK_BOT_TOKEN),
          signingSecret: String(process.env.SLACK_SIGNING_SECRET || ''),
          name: process.env.MESSAGE_USERNAME_OVERRIDE || 'SlackBot',
          appToken: process.env.SLACK_APP_TOKEN,
          defaultChannelId: process.env.SLACK_DEFAULT_CHANNEL_ID,
          joinChannels: process.env.SLACK_JOIN_CHANNELS,
        });
      }

      if (instances.length > 0) {
        debug(`Loaded ${instances.length} legacy Slack bot instances`);
      } else {
        debug('No legacy Slack configuration found');
      }
    } catch (error: any) {
      debug(`Legacy configuration loading failed: ${error.message || error}`);
      // Don't re-throw, allow service to initialize without legacy bots
    }

    return { instances, mode };
  }

  /**
   * Load configuration from config files (legacy support)
   */
  private static loadFromConfigFile(instances: SlackBotInstance[], mode: 'socket' | 'rtm'): void {
    try {
      // This would load from config/slack.json or similar files
      // For now, we'll keep this as a placeholder for future config file support
      debug('Config file loading not implemented yet');
    } catch (error: any) {
      debug(`Config file loading failed: ${error.message || error}`);
    }
  }

  /**
   * Validate a Slack bot configuration
   */
  public static validateBotConfig(config: SlackBotInstance): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.token) {
      errors.push('Bot token is required');
    } else if (!config.token.startsWith('xoxb-')) {
      errors.push('Bot token must start with xoxb-');
    }

    if (!config.signingSecret) {
      errors.push('Signing secret is required');
    }

    if (!config.name) {
      errors.push('Bot name is required');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get default channel from configuration
   */
  public static getDefaultChannel(): string {
    return slackConfig.get('SLACK_DEFAULT_CHANNEL_ID') || '';
  }
}
