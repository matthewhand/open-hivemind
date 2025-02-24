const gmpDebug = require('debug')('app:getMessengerProvider');
const messageConfigModule = require('@config/messageConfig');
const DiscordMgr = require('@integrations/discord/DiscordService');
const SlackMgr = require('@integrations/slack/SlackService');

const messageConfig = messageConfigModule.default || messageConfigModule;

/**
 * Get Messenger Providers
 *
 * Determines and returns an array of message provider instances based on the
 * configuration specified in MESSAGE_PROVIDER (comma-separated list).
 *
 * @returns Array of initialized message provider instances.
 */
export function getMessengerProvider() {
  const rawProviders = messageConfig.get('MESSAGE_PROVIDER') as unknown;
  const providers = (typeof rawProviders === 'string'
    ? rawProviders.split(',').map((v: string) => v.trim())
    : Array.isArray(rawProviders)
    ? rawProviders
    : ['slack']) as string[];
  gmpDebug(`Configured message providers: ${providers.join(', ')}`);

  const messengerServices = [];

  providers.forEach((provider: string) => {
    try {
      switch (provider.toLowerCase()) {
        case 'discord':
          messengerServices.push(DiscordMgr.Discord.DiscordService.getInstance());
          gmpDebug(`Initialized Discord provider`);
          break;
        case 'slack':
          messengerServices.push(new SlackMgr.SlackService());
          gmpDebug(`Initialized Slack provider`);
          break;
        default:
          gmpDebug(`Unsupported provider: ${provider}, skipping`);
      }
    } catch (error) {
      gmpDebug(`Failed to initialize provider ${provider}: ${error}`);
    }
  });

  if (messengerServices.length === 0) {
    gmpDebug('No valid messenger providers initialized, defaulting to Slack');
    messengerServices.push(new SlackMgr.SlackService());
  }

  return messengerServices;
}

module.exports = { getMessengerProvider };
