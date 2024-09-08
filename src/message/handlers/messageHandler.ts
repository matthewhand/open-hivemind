import Debug from 'debug';
import { IMessage } from '@src/message/interfaces/IMessage';
import { validateMessage } from '@src/message/helpers/processing/validateMessage';
import { processCommand } from '@src/message/helpers/processing/processCommand';
import { getMessageProvider } from '@src/message/management/getMessageProvider';
import { getLlmProvider } from '@src/message/management/getLlmProvider';
import { shouldReplyToMessage } from '@src/message/helpers/processing/shouldReplyToMessage';
import MessageDelayScheduler from '@src/message/helpers/timing/MessageDelayScheduler';
import ConfigurationManager from '@config/ConfigurationManager';
import { sendFollowUpRequest } from '@src/message/helpers/followUp/sendFollowUpRequest';

const debug = Debug('app:messageHandler');
const configManager = ConfigurationManager.getInstance();

// Define explicit type for messageConfig
interface MessageConfig {
  MESSAGE_LLM_CHAT?: boolean;
  MESSAGE_LLM_FOLLOW_UP?: boolean;
  MESSAGE_COMMAND_INLINE?: boolean;
  MESSAGE_COMMAND_SLASH?: boolean;
  MESSAGE_COMMAND_AUTHORISED_USERS?: string;
}

const messageConfig = configManager.getConfig('message') as MessageConfig;  // Properly initializing messageConfig
if (!messageConfig?.MESSAGE_LLM_CHAT) { messageConfig.MESSAGE_LLM_CHAT = true; }

/**
 * Message Handler
 *
 * Handles incoming messages by validating them, processing any commands they contain, and managing 
 * AI responses using the appropriate message provider. This function ensures that each message is 
 * processed accurately based on its content and context, while also considering response timing and 
 * follow-up logic.
 *
 * @param msg - The original message object implementing the IMessage interface.
 * @param historyMessages - The history of previous messages for context, defaults to an empty array.
 * @returns {Promise<void>}
 */
export async function messageHandler(
  msg: IMessage,
  historyMessages: IMessage[] = []
): Promise<void> {
  // Guard: Ensure a valid message object is provided
  if (!msg) {
    debug('No message provided.');
    return;
  }

  const startTime = Date.now();
  debug('Received message with ID:', msg.getMessageId(), 'at', new Date(startTime).toISOString());

  // Type Guard: Ensure msg implements IMessage and has necessary methods
  if (!(msg && 'getMessageId' in msg && typeof msg.getMessageId === 'function')) {
    debug('msg is not a valid IMessage instance.');
    return;
  }

  debug('msg is a valid instance of IMessage.');

  // Guard: Check that getText method exists and is valid
  if (typeof msg.getText !== 'function') {
    debug('msg does not have a valid getText method.');
    return;
  }

  debug('msg has a valid getText method.');

  // Guard: Ensure the message is not empty
  if (!msg.getText().trim()) {
    debug('Received an empty message.');
    return;
  }

  // Validate the message
  if (!validateMessage(msg)) {
    debug('Message validation failed.');
    return;
  }

  debug('Message validated successfully.');

  const messageProvider = getMessageProvider();
  const channelId = msg.getChannelId();
  
  // Process the command within the message
  let commandProcessed = false;
  await processCommand(msg, async (result: string) => {
    try {
      // Check if command is allowed and if MESSAGE_COMMAND_AUTHORISED_USERS is configured
      if (messageConfig?.MESSAGE_COMMAND_AUTHORISED_USERS) {
        const allowedUsers = messageConfig.MESSAGE_COMMAND_AUTHORISED_USERS.split(',');
        if (!allowedUsers.includes(msg.getAuthorId())) {
          debug('Command not authorized for user:', msg.getAuthorId());
          return;
        }
      }

      await messageProvider.sendMessageToChannel(channelId, result);
      commandProcessed = true;
      debug('Command reply sent successfully.');
    } catch (replyError) {
      debug('Failed to send command reply:', replyError);
    }
  });

  if (commandProcessed) {
    debug('Command processed, skipping LLM response.');
    return;
  }

  // Process LLM chat response if enabled
  if (messageConfig?.MESSAGE_LLM_CHAT && shouldReplyToMessage(msg)) {
    const llmProvider = getLlmProvider();
    const llmResponse = await llmProvider.generateChatResponse(msg.getText(), historyMessages);  // Convert to string if needed
    if (llmResponse) {
      // Schedule the message with MessageDelayScheduler
      const timingManager = MessageDelayScheduler.getInstance();
      timingManager.scheduleMessage(channelId, llmResponse, Date.now() - startTime, async (content) => {
        try {
          await messageProvider.sendMessageToChannel(channelId, content);
          debug('LLM response sent successfully.');
        } catch (replyError) {
          debug('Failed to send LLM response:', replyError);
        }
      });
    }
  }

  // Implement follow-up logic if both LLM_CHAT and FOLLOW_UP are enabled
  if (messageConfig?.MESSAGE_LLM_CHAT && messageConfig?.MESSAGE_LLM_FOLLOW_UP) {
    // Guard: Ensure command processing is enabled
    if (!messageConfig.MESSAGE_COMMAND_INLINE && !messageConfig.MESSAGE_COMMAND_SLASH) {
      debug('Follow-up logic is skipped because command processing is not enabled.');
      return;
    }
    
    debug('Follow-up logic is enabled.');
    // Using helper function to handle follow-up
    await sendFollowUpRequest(msg, channelId, 'AI response follow-up');
    debug('Follow-up request handled.');
  }

  debug('Message handling completed.');
}
