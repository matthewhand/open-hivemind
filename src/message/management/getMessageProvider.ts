const mgrDebug = require('debug');
const mgrMessageConfig = require('@message/interfaces/messageConfig');
const { DiscordMessageProvider } = require('@integrations/discord/providers/DiscordMessageProvider');
const SlackMsgProvider = require('@integrations/slack/providers/SlackMessageProvider');

const mgrLog = mgrDebug('app:getMessageProvider');

function getMessageProvider() {
  const provider = mgrMessageConfig.get('MESSAGE_PROVIDER');
  mgrLog(`Getting provider ${provider}`);

  switch (provider) {
    case 'discord':
      return new DiscordMessageProvider();
    case 'slack':
      return new SlackMsgProvider.SlackMessageProvider();
    default:
      mgrLog('Unknown provider, defaulting to Slack');
      return new SlackMsgProvider.SlackMessageProvider();
  }
}

module.exports = { getMessageProvider };
