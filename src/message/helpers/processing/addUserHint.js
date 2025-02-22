const addHintDebug = require('debug')('app:addUserHint');
const addHintConfig = require('@message/interfaces/messageConfig');

/**
 * @param {string} content - The message content to process
 * @param {string} userId - The ID of the user
 * @param {string} botId - The ID of the bot
 * @returns {string} - The processed message content
 */
function addUserHintFn(content, userId, botId) {
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

module.exports = {
  addUserHintFn
};
