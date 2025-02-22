const addHintDebug = require('debug')('app:addUserHint');
const addHintConfig = require('@message/interfaces/messageConfig');

function addUserHint(content: string, userId: string, botId: string): string {
  const shouldAddHint = addHintConfig.get('MESSAGE_ADD_USER_HINT');
  if (!shouldAddHint) {
    addHintDebug('User hint disabled by config');
    return content;
  }

  const botMention = `<@${botId}>`;
  if (!content.includes(botMention)) {
    addHintDebug('No bot mention found, returning original content');
    return content;
  }

  const userHint = `(from <@${userId}>)`;
  const updatedContent = content.split(botMention).join(userHint);
  addHintDebug(`Added user hint: ${updatedContent}`);
  return updatedContent;
}

module.exports = { addUserHint };
