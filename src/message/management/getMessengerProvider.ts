const gmpDebug = require('debug')('app:getMessengerProvider');
const gmpMessageConfigModule = require('@config/messageConfig');
const DiscordMgr = require('@integrations/discord/DiscordService');
const SlackMgr = require('@integrations/slack/SlackService');

const gmpMessageConfig = gmpMessageConfigModule.default || gmpMessageConfigModule;

function getMessengerProvider() {
  const provider = gmpMessageConfig.get('MESSAGE_PROVIDER');
  gmpDebug(`Getting provider ${provider}`);

  switch (provider) {
    case 'discord':
      return DiscordMgr.Discord.DiscordService.getInstance();
    case 'slack':
      return new SlackMgr.SlackService();
    default:
      gmpDebug('Unknown provider, defaulting to Slack');
      return new SlackMgr.SlackService();
  }
}

module.exports = { getMessengerProvider };
