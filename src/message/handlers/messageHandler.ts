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

    // Apply user-specific filtering if enabled
    const filterByUser = messageConfig.get('MESSAGE_FILTER_BY_USER');
    if (filterByUser) {
        const userId = message.getAuthorId();
        historyMessages = historyMessages.filter(msg => msg.getAuthorId() === userId);
        debug(`Filtered history to only include messages from user ${userId}.`);
    }

    debug(`Filtered history length: ${historyMessages.length}`);

    let commandProcessed = false;

    // Process inline commands if enabled
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
    const llmResponse = await llmProvider.generateChatCompletion([], message.getText());

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
