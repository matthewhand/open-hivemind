import OpenAiManager from '../../llm/openai/manager/OpenAiManager';
import { DiscordService } from '@src/message/discord/DiscordService';
import logger from '@src/utils/logger';
import constants from '@config/ConfigurationManager';
import commands from '@src/command/inline';

export async function sendMessageToChannel(messageContent: string, channelId: string, startTime: number): Promise<void> {
    try {
        const isValidString = typeof messageContent === 'string';
        if (!isValidString) {
            throw new Error('Invalid messageContent type: ' + typeof messageContent);
        }

        const isChannelIdValid = typeof channelId === 'string' && channelId.trim() !== '';
        if (!isChannelIdValid) {
            throw new Error('No channelId provided or channelId is not a valid string.');
        }

        const parts = splitMessageContent(messageContent, constants.MAX_MESSAGE_LENGTH);
        for (let i = 0; i < parts.length; i++) {
            if (i > 0) {
                await delay(constants.INTER_PART_DELAY);
            }
            logger.debug('[sendMessageToChannel] Sending part ' + (i + 1) + ' to channel ' + channelId + '. Part content: ' + parts[i]);
            await sendMessagePart(parts[i], channelId);
            logger.debug('[sendMessageToChannel] Sent part ' + (i + 1) + ' of ' + parts.length + ' to channel ' + channelId + '.');
        }

        const processingTime = Date.now() - startTime;
        logger.info('[sendMessageToChannel] Message processing complete. Total time: ' + processingTime + 'ms.');
    } catch (error: any) {
        logger.error('[sendMessageToChannel] Failed to send message to channel ' + channelId + '. Error: ' + error.message, { error });
        throw new Error('Failed to send message: ' + error.message);
    }
}

function splitMessageContent(messageContent: string, maxPartLength: number): string[] {
    const parts: string[] = [];
    let currentPart = '';

    const words = messageContent.split(' ');
    for (let word of words) {
        if (currentPart.length + word.length + 1 > maxPartLength) {
            parts.push(currentPart);
            currentPart = word;
        } else {
            currentPart += (currentPart.length > 0 ? ' ' : '') + word;
        }
    }
    if (currentPart) {
        parts.push(currentPart);
    }

    logger.debug('[splitMessageContent] Split message into ' + parts.length + ' parts.');
    return parts;
}

async function sendMessagePart(part: string, channelId: string): Promise<void> {
    try {
        const isValidPartString = typeof part === 'string';
        if (!isValidPartString) {
            throw new Error('Invalid part type: ' + typeof part);
        }

        logger.debug('[sendMessagePart] Sent message part to channel ' + channelId + '. Content length: ' + part.length + '.');
    } catch (error: any) {
        logger.error('[sendMessagePart] Failed to send message part to channel ' + channelId + '. Error: ' + error.message, { error });
        throw new Error('Failed to send message part: ' + error.message);
    }
}

function delay(duration: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, duration));
}

export async function sendFollowUp(originalMessage: any, topic: string): Promise<void> {
    logger.debug('Handling follow-up for message ID: ' + originalMessage.id);

    const channelTopic = topic || 'General conversation';
    const followUpDelay = 5 * 60 * 1000; // 5 minutes delay

    setTimeout(async () => {
        try {
            logger.debug('Commands loaded for follow-up.');
            const commandDescriptions = Object.values(commands).map(cmd => cmd.name + ': ' + cmd.description).join('; ');
            logger.debug('CommandHandler descriptions compiled: ' + commandDescriptions);

            const prompt = 'Inform user about a relevant command based on the discussion and topic, "' + channelTopic + '" from the built-in commands: ' + commandDescriptions + '. Suggest one command to user.';

            const requestBody = {
                model: constants.LLM_MODEL,
                prompt: prompt,
                max_tokens: 420,
                stop: ['\n', ' END'],
            };

            const responseContent = await makeOpenAiRequest(OpenAiManager, requestBody);
            if (!responseContent || responseContent.length === 0) {
                logger.error('Received empty or invalid response from OpenAI for follow-up.');
                return;
            }

            const followUpMessage = Array.isArray(responseContent) && typeof responseContent[0] === 'string' ? responseContent[0].trim() : '';
            if (followUpMessage) {
                await sendMessageToChannel(followUpMessage, originalMessage.getChannelId(), Date.now());
            } else {
                logger.warn('No follow-up action suggested for message ID: ' + originalMessage.id);
            }
        } catch (error: any) {
            logger.error('Error during follow-up handling: ' + error);
        }
    }, followUpDelay);
}

export async function makeOpenAiRequest(OpenAiManager: OpenAiManager, requestBody: { model: string, prompt: string }): Promise<string> {
    const response = await OpenAiManager.getClient().completions.create(requestBody);
    return response.choices[0].text.trim();
}
