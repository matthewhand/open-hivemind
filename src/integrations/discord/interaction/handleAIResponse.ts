import Debug from 'debug';
import { IMessage } from '@src/message/interfaces/IMessage';
import { OpenAiService } from '@src/integrations/openai/OpenAiService';

const debug = Debug('app:handleAIResponse');

/**
 * Handles the AI response interaction.
 * 
 * @param message - The message to process.
 * @param responseText - The response text from AI.
 * @returns A promise that resolves when the interaction is complete.
 */
export async function handleAIResponse(message: IMessage): Promise<void> {
    const openAiService = OpenAiService.getInstance();
    debug('Processing AI response for message ID: ' + message.getMessageId());

    const completion = await openAiService.createChatCompletion(message.getText());
    debug('Generated completion: ' + completion);

    // Send the AI-generated response
    await message.reply(completion);
}
