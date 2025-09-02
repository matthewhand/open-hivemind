import Debug from 'debug';
import { SlackBotManager } from '../SlackBotManager';
import { SlackSignatureVerifier } from '../SlackSignatureVerifier';
import { SlackConfigurationLoader, SlackBotInstance } from './SlackConfigurationLoader';

const debug = Debug('app:SlackService:InstanceFactory');

/**
 * Factory for creating basic Slack bot components
 * Note: Some components require the SlackService instance, so they're created separately
 */
export class SlackInstanceFactory {
  /**
   * Create a SlackBotManager instance from configuration
   */
  public static createBotManager(botConfig: any): SlackBotManager {
    debug(`Creating bot manager for: ${botConfig.name}`);

    // Extract the necessary configuration for the bot manager
    const botInstances = [{
      token: botConfig.slack.botToken,
      signingSecret: botConfig.slack.signingSecret,
      name: botConfig.name,
      appToken: botConfig.slack.appToken,
      defaultChannelId: botConfig.slack.defaultChannelId,
      joinChannels: botConfig.slack.joinChannels
    }];

    // Determine mode (socket vs rtm)
    const mode = botConfig.slack.appToken ? 'socket' : 'rtm';

    return new SlackBotManager(botInstances, mode);
  }

  /**
   * Create a SlackSignatureVerifier instance
   */
  public static createSignatureVerifier(signingSecret: string, botName?: string): SlackSignatureVerifier {
    debug(`Creating signature verifier for: ${botName || 'unknown'}`);
    return new SlackSignatureVerifier(signingSecret);
  }

  /**
   * Create multiple bot managers from configurations
   */
  public static createMultipleBotManagers(botConfigs: any[]): Map<string, SlackBotManager> {
    const managers = new Map<string, SlackBotManager>();

    for (const botConfig of botConfigs) {
      try {
        const manager = this.createBotManager(botConfig);
        managers.set(botConfig.name, manager);
        debug(`Successfully created bot manager: ${botConfig.name}`);
      } catch (error: any) {
        debug(`Failed to create bot manager ${botConfig.name}: ${error.message}`);
        // Continue with other bots even if one fails
      }
    }

    return managers;
  }

  /**
   * Create multiple signature verifiers from configurations
   */
  public static createMultipleSignatureVerifiers(botConfigs: any[]): Map<string, SlackSignatureVerifier> {
    const verifiers = new Map<string, SlackSignatureVerifier>();

    for (const botConfig of botConfigs) {
      try {
        const verifier = this.createSignatureVerifier(
          botConfig.slack.signingSecret,
          botConfig.name
        );
        verifiers.set(botConfig.name, verifier);
        debug(`Successfully created signature verifier: ${botConfig.name}`);
      } catch (error: any) {
        debug(`Failed to create signature verifier ${botConfig.name}: ${error.message}`);
        // Continue with other bots even if one fails
      }
    }

    return verifiers;
  }

  /**
   * Validate bot configuration before creating instances
   */
  public static validateBotConfig(botConfig: any): { valid: boolean, errors: string[] } {
    const errors: string[] = [];

    if (!botConfig.name) {
      errors.push('Bot name is required');
    }

    if (!botConfig.slack) {
      errors.push('Slack configuration is required');
    } else {
      if (!botConfig.slack.botToken) {
        errors.push('Slack bot token is required');
      } else if (!botConfig.slack.botToken.startsWith('xoxb-')) {
        errors.push('Bot token must start with xoxb-');
      }

      if (!botConfig.slack.signingSecret) {
        errors.push('Slack signing secret is required');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}