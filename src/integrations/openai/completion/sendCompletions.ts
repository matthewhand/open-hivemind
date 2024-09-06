import { OpenAI } from 'openai';
import Debug from 'debug';
import openaiConfig from '@integrations/openai/interfaces/openaiConfig';

const debug = Debug('app:sendCompletions');

export async function sendCompletion(): Promise<void> {
    const openai = new OpenAI({ apiKey: openaiConfig.get<string>('OPENAI_API_KEY')! });

    try {
        const response = await openai.completions.create({
            model: openaiConfig.get<string>('OPENAI_MODEL')!,
            prompt: 'Your prompt here',
            max_tokens: openaiConfig.get<number>('OPENAI_MAX_TOKENS')!,
            temperature: openaiConfig.get<number>('OPENAI_TEMPERATURE')!
        });

        if (!response.choices || !response.choices.length) {
            throw new Error('No completion choices returned.');
        }

        debug('Completion generated:', response.choices[0].text.trim());
    } catch (error: any) {
        debug('Error generating completion:', error.message);
        throw error;
    }
}
