const Debug = require('debug');
const { processCommand } = require('../helpers/commands/commandRouter');
const { stripBotId } = require('../helpers/processing/stripBotId');
const addUserHintUtil = require('../helpers/processing/addUserHint');
const { getLlmProvider } = require('@src/llm/getLlmProvider');
const { shouldReplyToMessage, markChannelAsInteracted } = require('../helpers/processing/messageUtils');
const { MessageDelayScheduler } = require('../helpers/handler/MessageDelayScheduler');
const { sendFollowUpRequest } = require('../helpers/handler/sendFollowUpRequest');
const messageHandlerConfig = require('@message/interfaces/messageConfig');
const { getMessageProvider: handlerGetMessageProvider } = require('@src/message/management/getMessageProvider');

const debug = Debug('app:messageHandler');

async function handleMessage(message, historyMessages) {
  try {
    if (!message.getText()) {
      debug('Empty message content, skipping processing.');
      return '';
    }

    let processedMessage = message.getText();
    const botId = String(messageHandlerConfig.get('BOT_ID') || handlerGetMessageProvider().getClientId());
    const userId = message.getAuthorId();
    processedMessage = stripBotId(processedMessage, botId);
    processedMessage = addUserHintUtil.addUserHintFn(processedMessage, userId, botId);

    debug(`Processing message in channel ${message.getChannelId()} from user ${userId}: "${processedMessage}"`);
    console.log(`Processed message: "${processedMessage}"`);

    let commandProcessed = false;
    if (Boolean(messageHandlerConfig.get('MESSAGE_COMMAND_INLINE'))) {
      await processCommand(message, async (result) => {
        const authorisedUsers = String(messageHandlerConfig.get('MESSAGE_COMMAND_AUTHORISED_USERS') || '');
        const allowedUsers = authorisedUsers.split(',').map(user => user.trim());
        if (!allowedUsers.includes(message.getAuthorId())) {
          debug('User not authorized:', message.getAuthorId());
          await handlerGetMessageProvider().sendMessageToChannel(message.getChannelId(), 'You are not authorized to use commands.', 'Jeeves');
          return;
        }
        await handlerGetMessageProvider().sendMessageToChannel(message.getChannelId(), result, 'Jeeves');
        commandProcessed = true;
      });
      if (commandProcessed) return '';
    }

    const messageProviderType = String(messageHandlerConfig.get('MESSAGE_PROVIDER'));
    const providerType = (messageProviderType === 'discord' ? 'discord' : 'generic');
    if (!shouldReplyToMessage(message, botId, providerType)) return '';

    const timingManager = MessageDelayScheduler.getInstance();
    const startTime = Date.now();
    await timingManager.scheduleMessage(
      message.getChannelId(),
      "cmd",
      message.getText(),
      message.getAuthorId(),
      async (text, threadId) => {
        const activeAgentName = message.metadata?.active_agent_name || 'Jeeves';
        const sentResult = await handlerGetMessageProvider().sendMessageToChannel(message.getChannelId(), text, activeAgentName);
        if (Boolean(messageHandlerConfig.get('MESSAGE_LLM_FOLLOW_UP'))) {
          const followUpText = 'Follow-up text';
          await sendFollowUpRequest(message, message.getChannelId(), followUpText);
          debug('Sent follow-up request.');
        }
        return sentResult;
      },
      false
    );
    const endTime = Date.now();
    const processingTime = endTime - startTime;
    debug(`Message processed in ${processingTime}ms`);
    return processedMessage;
  } catch (error) {
    debug('Error handling message:', error.stack);
    return '';
  }
}

module.exports = { handleMessage };
