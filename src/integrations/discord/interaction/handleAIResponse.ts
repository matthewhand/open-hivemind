import Debug from 'debug';
import { IMessage } from '@src/message/interfaces/IMessage';
import { Client } from 'discord.js';
import { prepareMessageBody } from '@src/message/helpers/processing/prepareMessageBody';
import { summarizeMessage } from '@src/message/helpers/processing/summarizeMessage';
import { sendFollowUp } from '@src/integrations/discord/interaction/sendFollowUp';
import { sendMessageToChannel } from '@src/integrations/discord/interaction/sendMessageToChannel';
import { sendChatCompletionsRequest } from '@src/integrations/openai/operations/sendChatCompletionsRequest';
import { OpenAiService } from '@src/integrations/openai/OpenAiService';
import ConfigurationManager from '@src/common/config/ConfigurationManager';

const debug = Debug('app:handleAIResponse');

/**
 * Handles the AI-generated response and sends it to the Discord channel.
 *
 * This function processes the AI response, formats the message, and sends it to the appropriate Discord channel.
 * It uses the OpenAI API to generate responses and ensures the response is sent correctly.
 *
 * Key Features:
 * - Prepares message body for AI processing
 * - Sends the request to OpenAI API
 * - Logs important steps for debugging and monitoring
 *
 * @param {Client} client - The Discord client instance.
 * @param {IMessage} message - The incoming message.
 * @returns {Promise<void>} A promise that resolves when the response is sent.
 */
export async function handleAIResponse(client: Client<boolean>, message: IMessage): Promise<void> {
    const openAiService = OpenAiService.getInstance();  // Use OpenAiService for LLM operations

    const requestBody = await prepareMessageBody(message.getText(), message.getChannelId(), []);
    debug('Prepared requestBody: ' + JSON.stringify(requestBody));

    let llmResponse;
    try {
        llmResponse = await sendChatCompletionsRequest(openAiService
        debug('LLM request sent successfully.');
    } catch (error: any) {
        debug('Error sending LLM request: ' + error.message);
        return;
    }

    let responseContent;
    try {
        responseContent = llmResponse.getContent();
        debug('LLM response content: ' + responseContent);

        if (typeof responseContent !== 'string') {
            throw new Error('Expected string from LLM response, received: ' + typeof responseContent);
        }

        const finishReason = llmResponse.getFinishReason();
        if (finishReason !== 'stop') {
            throw new Error('LLM response finished with reason: ' + finishReason);
        }

        if (!responseContent.trim()) {
            throw new Error('LLM provided an empty or invalid response.');
        }

        if (responseContent.length > ConfigurationManager.DISCORD_MAX_MESSAGE_LENGTH) {  // Use correct reference to ConfigurationManager
            responseContent = await summarizeMessage(responseContent);
            debug('LLM response summarized due to length.');
        }
    } catch (error: any) {
        debug('Error processing LLM response content: ' + error.message);
        return;
    }

    try {
        await sendMessageToChannel(client, message.getChannelId(), responseContent);
        debug('Sent message to channel successfully.');
    } catch (error: any) {
        debug('Error sending response to channel: ' + error.message);
        return;
    }

    if (ConfigurationManager.MESSAGE_FOLLOW_UP_ENABLED) {  // Use correct reference to ConfigurationManager
        try {
            await sendFollowUp(client, message, message.getChannelId(), message.getChannelTopic() || 'General Discussion');
            debug('Follow-up interaction initiated.');
        } catch (error: any) {
            debug('Error initiating follow-up interaction: ' + error.message);
        }
    }
}
