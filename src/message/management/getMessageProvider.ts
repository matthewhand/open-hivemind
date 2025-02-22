const gpmDebug = require('debug')('app:getMessageProvider');
const gpmConfig = require('@message/interfaces/messageConfig');
const { DiscordMessageProvider } = require('@integrations/discord/providers/DiscordMessageProvider');
const { SlackMessageProvider } = require('@integrations/slack/providers/SlackMessageProvider');

function getMessageProvider(): any {
  const provider = (gpmConfig.get('MESSAGE_PROVIDER') || 'discord').toLowerCase();
  gpmDebug(`Getting provider ${provider}`);

  if (provider === 'discord') {
    gpmDebug('Returning DiscordMessageProvider');
    return new DiscordMessageProvider();
  } else if (provider === 'slack') {
    gpmDebug('Returning SlackMessageProvider');
    return new SlackMessageProvider();
  } else {
    gpmDebug(`Unknown provider '${provider}', defaulting to DiscordMessageProvider`);
    return new DiscordMessageProvider();
  }
}

module.exports = { getMessageProvider };
