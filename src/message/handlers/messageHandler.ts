/**
 * messageHandler.ts
 * 
 * This module handles incoming messages, validates them, processes commands, 
 * and determines whether the bot should respond unsolicitedly based on configured 
 * probabilities and message content. It ensures efficient message processing with 
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

    const refusalText = (messageConfig.get('MESSAGE_REFUSAL_TEXT') || 'Nupe').trim();
    const refusalPrompt = (messageConfig.get('MESSAGE_REFUSAL_PROMPT') || 
        'generate brief whimsical refusal for user').trim();
    const defaultResponse = messageConfig.get('MESSAGE_REFUSAL_DEFAULT_RESPONSE') || 
        'Oops, that’s tricky! Check docs for more insights.';

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

    // Check if the message matches the refusal text
    if (message.getText().trim().toLowerCase() === refusalText.toLowerCase()) {
        debug('Refusal text detected. Invoking generateHelpfulMessage...');
        const helpfulMessage = await generateHelpfulMessage(getLlmProvider(), refusalPrompt, refusalText);

        const response = helpfulMessage || defaultResponse;
        debug(`Sending response: ${response}`);
        await provider.sendMessageToChannel(message.getChannelId(), response);
        return;
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

/**
 * Generates a helpful message using the LLM provider.
 * @param {any} llmProvider - The LLM provider instance.
 * @param {string} refusalPrompt - The prompt to generate a response.
 * @param {string} refusalText - The configured refusal text to avoid echoing.
 * @returns {Promise<string | null>} - The generated message or null if it matches the refusal text.
 */
async function generateHelpfulMessage(
    llmProvider: any, 
    refusalPrompt: string, 
    refusalText: string
): Promise<string | null> {
    try {
        const completion = await llmProvider.generateCompletion(refusalPrompt);
        debug('Generated helpful message:', completion);

        const normalizedCompletion = completion?.trim().toLowerCase();
        const normalizedRefusal = refusalText.trim().toLowerCase();

        // Side-by-side comparison for better visibility
        debug(`Comparing LLM response vs. refusal text:\n - LLM: "${normalizedCompletion}"\n - Refusal: "${normalizedRefusal}"`);

        if (!normalizedCompletion || normalizedCompletion === normalizedRefusal) {
            debug('LLM response matches refusal text. Returning null.');
            return null;
        }

        return completion.trim();
    } catch (error) {
        debug('Error generating helpful message:', error);
        return null;
    }
}
