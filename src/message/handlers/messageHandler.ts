/**
 * messageHandler.ts
 * 
 * This module handles incoming messages, validates them, processes commands, and determines
 * whether the bot should respond unsolicitedly based on configured probabilities and message content.
 * It ensures efficient message processing with appropriate debugging and error handling.
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
import { DiscordService } from '@src/integrations/discord/DiscordService';

const debug = Debug('app:messageHandler');
const ignoreBots = messageConfig.get('MESSAGE_IGNORE_BOTS') === true;

/**
 * Handles incoming Discord messages and processes them.
 * @param {IMessage} message - The incoming message object.
 * @param {IMessage[]} historyMessages - An array of recent message history.
 */
export async function handleMessage(message: IMessage, historyMessages: IMessage[]): Promise<void> {
    const botClientId = process.env.DISCORD_CLIENT_ID || "botId_placeholder";

    if (!message.getAuthorId || !message.getChannelId) {
        debug('Invalid message object. Missing necessary methods: ' + JSON.stringify(message));
        return;
    }

    const startTime = Date.now(); // Start time for processing

    // Guard: Ignore bot messages if configured
    if (message.isFromBot() && ignoreBots) {
        debug(`[handleMessage] Ignoring message from bot: ${message.getAuthorId()}`);
        return;
    }

    const isValidMessage = await validateMessage(message);
    if (!isValidMessage) {
        debug('Message validation failed. Exiting handler.');
        return;
    }
    debug('Message validated successfully.');

    let commandProcessed = false;

    // Process inline commands, if any
    await processCommand(message, async (result: string) => {
        const authorisedUsers = messageConfig.get('MESSAGE_COMMAND_AUTHORISED_USERS') as string;
        const allowedUsers = authorisedUsers ? authorisedUsers.split(',') : [];
        if (!allowedUsers.includes(message.getAuthorId())) {
            debug('Command not authorized for user:', message.getAuthorId());
            return;
        }
        debug('Sending command result:', result);
        commandProcessed = true;

        // Send the command result immediately without delay using DiscordService
        try {
            const discordService = DiscordService.getInstance();
            await discordService.sendMessageToChannel(message.getChannelId(), result);
            debug('Command reply sent successfully.');

            // Mark channel as interacted
            markChannelAsInteracted(message.getChannelId());
        } catch (error) {
            debug('Error sending command reply:', error);
        }
    });

    if (commandProcessed) {
        return;
    }

    // Determine if bot should reply
    const shouldReply = shouldReplyToMessage(message, botClientId, "discord", 300000); // 5 minutes activity window
    if (!shouldReply) {
        debug('Message is not eligible for reply:', message);
        return;
    }

    // Generate response using LLM if enabled
    if (messageConfig.get('MESSAGE_LLM_CHAT')) {
        const llmProvider = getLlmProvider();
        if (!llmProvider) {
            debug('No LLM provider available.');
            return;
        }
        const llmResponse = await llmProvider.generateChatCompletion([], message.getText());
        if (llmResponse) {
            const timingManager = MessageDelayScheduler.getInstance();
            const discordService = DiscordService.getInstance();

            // Calculate processing time
            const processingTime = Date.now() - startTime;

            // Define the send function to send the message via DiscordService
            const sendFunction = async (response: string) => {
                try {
                    await discordService.sendMessageToChannel(message.getChannelId(), response);
                    debug(`Sent LLM-generated message: ${response}`);

                    // Mark channel as interacted
                    markChannelAsInteracted(message.getChannelId());
                } catch (error: any) {
                    debug('Error sending LLM-generated message:', error);
                }
            };

            // Schedule the message with correct parameters
            timingManager.scheduleMessage(
                message.getChannelId(),
                llmResponse,
                processingTime,
                sendFunction
            );

            debug('Scheduled LLM-generated content:', llmResponse);
        }
    }

    // Follow-up logic, if enabled
    if (messageConfig.get('MESSAGE_LLM_FOLLOW_UP')) {
        const followUpText = 'Follow-up text';
        await sendFollowUpRequest(message, message.getChannelId(), followUpText);
    }
}
