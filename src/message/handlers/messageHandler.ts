/**
 * messageHandler.ts
 *
 * This module handles incoming messages, validates them, processes commands,
 * and determines whether the bot should respond based on message content
 * and configured probabilities. It ensures efficient message processing with
 * appropriate debugging and error handling.
 */

import Debug from 'debug';
import { IMessage } from '@src/message/interfaces/IMessage';
import { validateMessage } from '@src/message/helpers/handler/validateMessage';
import { processCommand } from '@src/message/helpers/handler/processCommand';
import { getLlmProvider } from '@src/llm/getLlmProvider';
import { shouldReplyToMessage, markChannelAsInteracted } from '@src/message/helpers/processing/shouldReplyToMessage';
import { MessageDelayScheduler } from '@src/message/helpers/handler/MessageDelayScheduler';
import { sendFollowUpRequest } from '@src/message/helpers/handler/sendFollowUpRequest';
import messageConfig from '@src/message/interfaces/messageConfig';
import { getMessageProvider } from '@src/message/management/getMessageProvider';

const debug = Debug('app:messageHandler');
const ignoreBots = messageConfig.get('MESSAGE_IGNORE_BOTS') === true;

/**
 * Dynamically recreate the original IMessage implementation with aggregated text.
 * @param {IMessage} originalMessage - The original message object.
 * @param {string} aggregatedText - The aggregated content.
 * @returns {IMessage} A new instance of the same IMessage implementation.
 */
function recreateMessageWithAggregatedText(
    originalMessage: IMessage,
    aggregatedText: string
): IMessage {
    const MessageConstructor = originalMessage.constructor as new (...args: any[]) => IMessage;

    // Create a new instance using the same constructor, with updated text and original metadata.
    return new MessageConstructor(
        aggregatedText,                    // Updated text content
        originalMessage.getChannelId(),    // Original channel ID
        originalMessage.getAuthorId(),     // Original author ID
        originalMessage.data               // Original data
    );
}

/**
 * Handles incoming messages, processes commands, and interacts with the LLM.
 * @param {IMessage} message - The incoming message object.
 * @param {IMessage[]} historyMessages - An array of recent message history.
 */
export async function handleMessage(message: IMessage, historyMessages: IMessage[]): Promise<void> {
    const provider = getMessageProvider();
    const startTime = Date.now(); // Track start time for processing

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
    let llmInputMessages: IMessage[] = [];

    if (filterByUser) {
        // Aggregate the text from all messages by the same user.
        const userId = message.getAuthorId();
        const aggregatedText = historyMessages
            .filter(msg => msg.getAuthorId() === userId)
            .map(msg => msg.getText().trim())
            .join(' ');

        debug(`Aggregated messages for user ${userId}: ${aggregatedText}`);

        // Dynamically recreate the original message with aggregated text.
        message = recreateMessageWithAggregatedText(message, aggregatedText);
    } else {
        // Use the entire message history if filtering is disabled.
        llmInputMessages = historyMessages;
        debug(`Passing full message history with ${llmInputMessages.length} messages.`);
    }

    let commandProcessed = false;

    if (messageConfig.get('MESSAGE_COMMAND_INLINE')) {
        await processCommand(message, async (result: string) => {
            const authorisedUsers = messageConfig.get('MESSAGE_COMMAND_AUTHORISED_USERS') || '';
            const allowedUsers = authorisedUsers.split(',');

            if (!allowedUsers.includes(message.getAuthorId())) {
                debug('User not authorized to run commands:', message.getAuthorId());
                return;
            }

            try {
                await provider.sendMessageToChannel(message.getChannelId(), result);
                debug('Command response sent successfully.');
                markChannelAsInteracted(message.getChannelId());
                commandProcessed = true;
            } catch (error) {
                debug('Error sending command response:', error);
            }
        });

        if (commandProcessed) return;
    }

    const botClientId = provider.getClientId();
    const shouldReply = shouldReplyToMessage(message, botClientId, 'discord');
    if (!shouldReply) {
        debug('Message is not eligible for reply:', message);
        return;
    }

    const llmProvider = getLlmProvider();
    const llmResponse = await llmProvider.generateChatCompletion(
        filterByUser ? [] : llmInputMessages, // Use history only if not filtering by user
        message.getText()
    );

    if (llmResponse) {
        const timingManager = MessageDelayScheduler.getInstance();
        const processingTime = Date.now() - startTime;

        const sendFunction = async (response: string) => {
            try {
                await provider.sendMessageToChannel(message.getChannelId(), response);
                debug(`Sent LLM-generated message: ${response}`);
                markChannelAsInteracted(message.getChannelId());
            } catch (error) {
                debug('Error sending LLM-generated message:', error);
            }
        };

        timingManager.scheduleMessage(message.getChannelId(), llmResponse, processingTime, sendFunction);
        debug('Scheduled LLM response:', llmResponse);
    }

    if (messageConfig.get('MESSAGE_LLM_FOLLOW_UP')) {
        const followUpText = 'Follow-up text';
        await sendFollowUpRequest(message, message.getChannelId(), followUpText);
    }
}
