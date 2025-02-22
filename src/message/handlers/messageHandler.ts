import Debug from 'debug';
// import * as commandRouter from '../helpers/commands/commandRouter';
import { stripBotId } from '../helpers/processing/stripBotId';
// import { addUserHintFn as addUserHintUtil } from '../helpers/processing/addUserHint';
// import { getLlmProvider } from '@src/llm/getLlmProvider';
import { shouldReplyToMessage } from '../helpers/processing/shouldReplyToMessage';
import MessageDelayScheduler from '../helpers/handler/MessageDelayScheduler';
import { sendFollowUpRequest } from '../helpers/handler/sendFollowUpRequest';
import { processCommand } from '../helpers/handler/processCommand';
import messageHandlerConfig from '@message/interfaces/messageConfig';
import { getMessageProvider } from '@src/message/management/getMessageProvider';

const debug = Debug('app:messageHandler');

async function handleMessage(message: import("../interfaces/IMessage").IMessage, historyMessages: import("../interfaces/IMessage").IMessage[]): Promise<string> {
  try {
    if (!message.getText()) {
      debug('Empty message content, skipping processing.');
      return '';
    }

    let processedMessage = message.getText();
    const botId = String(messageHandlerConfig.get('BOT_ID') || getMessageProvider().getClientId());
    const userId = message.getAuthorId();
    processedMessage = stripBotId(processedMessage, botId);
    // processedMessage = addUserHintUtil.addUserHintFn(processedMessage, userId, botId);

    debug(`Processing message in channel ${message.getChannelId()} from user ${userId}: "${processedMessage}"`);
    console.log(`Processed message: "${processedMessage}"`);

    let commandProcessed = false;
    if (Boolean(messageHandlerConfig.get('MESSAGE_COMMAND_INLINE'))) {
      await processCommand(message, async (result) => {
        const authorisedUsers = String(messageHandlerConfig.get('MESSAGE_COMMAND_AUTHORISED_USERS') || '');
        const allowedUsers = authorisedUsers.split(',').map(user => user.trim());
        if (!allowedUsers.includes(message.getAuthorId())) {
          debug('User not authorized:', message.getAuthorId());
          await getMessageProvider().sendMessageToChannel(message.getChannelId(), 'You are not authorized to use commands.', 'Jeeves');
          return;
        }
        await getMessageProvider().sendMessageToChannel(message.getChannelId(), result, 'Jeeves');
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
        const sentResult = await getMessageProvider().sendMessageToChannel(message.getChannelId(), text, activeAgentName);
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
    debug('Error handling message:', (error as any).stack);
    return '';
  }
}

module.exports = { handleMessage };
