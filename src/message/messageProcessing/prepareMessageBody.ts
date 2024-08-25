import { OpenAiManager } from '../llm/openai/manager/OpenAiManager';
import logger from '@src/utils/logger';

export function prepareMessageBody(prompt: string): { model: string, prompt: string, max_tokens: number } {
    try {
        return {
            model: 'text-davinci-003',
            prompt: prompt,
            max_tokens: 100,
        };
    } catch (error: any) {
        logger.error('Failed to prepare message body:', error);
        throw error;
    }
}
