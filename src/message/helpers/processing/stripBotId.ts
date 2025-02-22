const stripDebug = require('debug')('app:stripBotId');
const stripMsgConfig = require('../../interfaces/messageConfig');

function stripBotId(content: any, botId: any) {
  const botMention = `<@${botId}>`;
  if (content.includes(botMention)) {
    const strippedContent = content.split(botMention).join('').trim();
    stripDebug(`Stripped bot ID ${botId} from content: ${strippedContent}`);
    return strippedContent;
  }
  return content;
}

module.exports = { stripBotId };
