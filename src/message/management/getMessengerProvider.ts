const mgrDebug = require('debug');
const mgrMessageConfig = require('@message/interfaces/messageConfig');
const DiscordMgr = require('@integrations/discord/DiscordService');
const SlackMgr = require('@integrations/slack/SlackService');

const mgrLog = mgrDebug('app:getMessengerProvider');

function getMessengerProvider() {
  const provider = mgrMessageConfig.get('MESSAGE_PROVIDER');
  mgrLog(`Getting provider ${provider}`);

  switch (provider) {
    case 'discord':
      return DiscordMgr.Discord.DiscordService.getInstance();
    case 'slack':
      return new SlackMgr.SlackService();
    default:
      mgrLog('Unknown provider, defaulting to Slack');
      return new SlackMgr.SlackService();
  }
}

module.exports = { getMessengerProvider };
