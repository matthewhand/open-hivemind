import Debug from "debug";
const debug = Debug("app");

import { IMessage } from '@src/message/interfaces/IMessage';
import { LlmService } from '@src/llm/interfaces/LlmService';
import { prepareMessageBody } from '../processing/prepareMessageBody';
import { summarizeMessage } from '../processing/summarizeMessage';
import { sendFollowUp } from '../interaction/sendFollowUp';
import { sendMessageToChannel } from '../interaction/sendMessageToChannel';
import constants from '@config/ConfigurationManager';
import Debug from 'debug';
import { Client } from 'discord.js';
const debug = Debug('app:discord:handleAIResponse');
/**
 * Handles the logic for processing an AI response to a message.
 * @param client - The Discord client instance.
 * @param message - The incoming message.
 */
export async function handleAIResponse(client: Client, message: IMessage): Promise<void> {
    const llmManager = LlmService.getManager();
    if (llmManager.isBusy()) {
        debug('LLM Manager is busy.');
        return;
    }
    let requestBody;
    try {
        requestBody = await prepareMessageBody(
            constants.LLM_SYSTEM_PROMPT,
            message.getChannelId(),
            []
        );
        debug('Prepared requestBody: ' + JSON.stringify(requestBody));
    } catch (error: any) {
        debug('Error preparing LLM request body: ' + error);
        return;
    }
    let llmResponse;
    try {
        llmResponse = await llmManager.sendRequest(requestBody);
        debug('LLM request sent successfully.');
    } catch (error: any) {
        debug('Error sending LLM request: ' + error);
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
        if (responseContent.length > constants.MAX_MESSAGE_LENGTH) {
            responseContent = await summarizeMessage(responseContent);
            debug('LLM response summarized due to length.');
        }
    } catch (error: any) {
        debug('Error processing LLM response content: ' + error);
        return;
    }
    try {
        await sendMessageToChannel(client, message.getChannelId(), responseContent);
        debug('Sent message to channel successfully.');
    } catch (error: any) {
        debug('Error sending response to channel: ' + error);
        return;
    }
    if (constants.FOLLOW_UP_ENABLED) {
        try {
            await sendFollowUp(client, message, message.getChannelId(), message.getChannelTopic() || 'General Discussion');
            debug('Follow-up interaction initiated.');
        } catch (error: any) {
            debug('Error initiating follow-up interaction: ' + error);
        }
    }
}
