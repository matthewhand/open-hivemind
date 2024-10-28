/**
 * messageHandler.ts
 *
 * This module handles incoming messages, processes commands, and interacts with the LLM.
 */

import Debug from 'debug';
import { IMessageProvider } from '@src/message/interfaces/IMessageProvider';
import { IMessage } from '@src/message/interfaces/IMessage';
import { stripBotId } from '../helpers/processing/stripBotId';
import { addUserHint } from '../helpers/processing/addUserHint';
import { validateMessage } from '../helpers/handler/validateMessage';
import { processCommand } from '../helpers/handler/processCommand';
import { getLlmProvider } from '@src/llm/getLlmProvider';
import { shouldReplyToMessage, markChannelAsInteracted } from '../helpers/processing/shouldReplyToMessage';
import { MessageDelayScheduler } from '../helpers/handler/MessageDelayScheduler';
import { sendFollowUpRequest } from '../helpers/handler/sendFollowUpRequest';
import messageConfig from '@src/message/interfaces/messageConfig';
import { getMessageProvider } from '@src/message/management/getMessageProvider';

const debug = Debug('app:messageHandler');
const ignoreBots = messageConfig.get('MESSAGE_IGNORE_BOTS') === true;

// Initialize a single instance of IMessageProvider to avoid repetitive calls
const messageProvider: IMessageProvider = getMessageProvider();

/**
 * Handles incoming messages, processes commands, and interacts with the LLM.
 * @param {IMessage} message - The incoming message object.
 * @param {IMessage[]} historyMessages - An array of recent message history.
 */
export async function handleMessage(message: IMessage, historyMessages: IMessage[]): Promise<void> {
    try {
        debug(`Handling message from user ${message.getAuthorId()} in channel ${message.getChannelId()}.`);
        console.log(`Handling message from user ${message.getAuthorId()} in channel ${message.getChannelId()}.`);

        // Validate message
        if (!message.getAuthorId() || !message.getChannelId()) {
            debug('Invalid message object. Missing required methods:', JSON.stringify(message));
            return;
        }

        if (message.isFromBot() && ignoreBots) {
            debug(`[handleMessage] Ignoring bot message from: ${message.getAuthorId()}`);
            return;
        }

        if (!(await validateMessage(message))) {
            debug('Message validation failed.');
            return;
        }

        const filterByUser = messageConfig.get('MESSAGE_FILTER_BY_USER');
        debug(`MESSAGE_FILTER_BY_USER: ${filterByUser}`);  // Confirm the config value

        let processedMessage = message.getText();

        // Apply bot ID stripping and user hinting
        const botId = messageConfig.get('BOT_ID') || messageProvider.getClientId(); // Fallback to provider's bot ID
        const userId = message.getAuthorId();

        processedMessage = stripBotId(processedMessage, botId);
        processedMessage = addUserHint(processedMessage, userId, botId);

        debug(`Processed message: "${processedMessage}"`);
        console.log(`Processed message: "${processedMessage}"`);

        let llmInputMessages: IMessage[] = [];

        if (filterByUser) {
            const userMessages = historyMessages.filter((msg) => {
                const isFromUser = msg.getAuthorId() === userId;
                debug(`Checking message ID: ${msg.getMessageId()} - Is from user? ${isFromUser}`);
                return isFromUser;
            });

            if (userMessages.length) {
                const aggregatedText = userMessages
                    .map((msg) => msg.getText().trim() || '[No content]')
                    .join(' ');

                debug(`Aggregated text for user ${userId}: "${aggregatedText}"`);
                message.setText(aggregatedText);
            } else {
                debug('No messages found to aggregate. Skipping aggregation.');
            }
        } else {
            llmInputMessages = historyMessages;
            debug(`Using full message history with ${llmInputMessages.length} messages.`);
        }

        let commandProcessed = false;

        if (messageConfig.get('MESSAGE_COMMAND_INLINE')) {
            await processCommand(message, async (result: string) => {
                const authorisedUsers = messageConfig.get('MESSAGE_COMMAND_AUTHORISED_USERS') || '';
                const allowedUsers = authorisedUsers.split(',').map(user => user.trim());

                if (!allowedUsers.includes(message.getAuthorId())) {
                    debug('User not authorized to run commands:', message.getAuthorId());
                    return;
                }

                try {
                    await messageProvider.sendMessageToChannel(message.getChannelId(), result);
                    debug('Command response sent successfully.');
                    markChannelAsInteracted(message.getChannelId());
                    commandProcessed = true;
                } catch (error) {
                    debug('Error sending command response:', (error as Error).message);
                }
            });

            if (commandProcessed) return;
        }

        const shouldReply = shouldReplyToMessage(message, botId, messageConfig.get('PLATFORM') as 'discord' | 'generic');

        if (!shouldReply) {
            debug('Message is not eligible for reply:', message);
            return;
        }

        const llmProvider = getLlmProvider();
        const llmResponse = await llmProvider.generateChatCompletion(
            message.getText() || '',
            llmInputMessages
        );

        if (llmResponse) {
            const timingManager = MessageDelayScheduler.getInstance();
            const processingTime = Date.now() - Date.now(); // This seems incorrect; adjust below.

            const startTime = Date.now(); // Start time before processing
            const response = await generateResponse(processedMessage);
            const endTime = Date.now();
            const actualProcessingTime = endTime - startTime;

            const sendFunction = async (responseContent: string) => {
                try {
                    await messageProvider.sendMessageToChannel(message.getChannelId(), responseContent);
                    debug(`Sent LLM-generated message: ${responseContent}`);
                    markChannelAsInteracted(message.getChannelId());
                } catch (error) {
                    debug('Error sending LLM-generated message:', (error as Error).message);
                }
            };

            timingManager.scheduleMessage(message.getChannelId(), llmResponse, actualProcessingTime, sendFunction);
            debug('Scheduled LLM response:', llmResponse);
        }

        if (messageConfig.get('MESSAGE_LLM_FOLLOW_UP')) {
            const followUpText = 'Follow-up text'; // This could be dynamic based on response
            await sendFollowUpRequest(message, message.getChannelId(), followUpText);
            debug('Sent follow-up request.');
        }

    } catch (error) {
        debug(`Error handling message: ${(error as Error).message}`);
        console.error(`Error handling message: ${(error as Error).message}`);
        // Optionally implement further error handling or notifications
    }
}

// /**
//  * Retrieves the IMessageProvider instance based on configuration.
//  * This function ensures that the message provider is initialized only once.
//  * @returns {IMessageProvider} The message provider instance.
//  */
// function getMessageProvider(): IMessageProvider {
//     const provider = messageConfig.get('MESSAGE_PROVIDER');
//     switch (provider) {
//         case 'discord':
//             const { DiscordMessageProvider } = require('../../integrations/discord/DiscordMessageProvider');
//             return new DiscordMessageProvider();
//         // Add cases for other providers as needed
//         default:
//             throw new Error(`Unsupported message provider: ${provider}`);
//     }
// }

/**
 * Generates a response based on the processed message.
 * Placeholder for actual response generation logic (e.g., LLM integration).
 * @param {string} message - The processed message content.
 * @returns {Promise<string>} The generated response.
 */
async function generateResponse(message: string): Promise<string> {
    // Placeholder implementation
    // Replace with actual logic, such as querying an LLM or predefined responses
    return `You said: "${message}"`;
}
