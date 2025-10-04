import { OpenAI } from 'openai';
import Debug from 'debug';
import openaiConfig from '@config/openaiConfig';
import { HivemindError, ErrorUtils } from '@src/types/errors';

const debug = Debug('app:sendCompletions');

export async function sendCompletion(): Promise<void> {
    const openai = new OpenAI({ apiKey: openaiConfig.get('OPENAI_API_KEY')! });

    try {
        const response = await openai.completions.create({
            model: openaiConfig.get('OPENAI_MODEL')!,
            prompt: 'Your prompt here',
            max_tokens: openaiConfig.get('OPENAI_MAX_TOKENS')!,
            temperature: openaiConfig.get('OPENAI_TEMPERATURE')!
        });

        if (!response.choices || !response.choices.length) {
            throw new Error('No completion choices returned.');
        }

        debug('Completion generated:', response.choices[0].text.trim());
    } catch (error: unknown) {
        const hivemindError = ErrorUtils.toHivemindError(error);
        const classification = ErrorUtils.classifyError(hivemindError);
        
        debug('Error generating completion:', ErrorUtils.getMessage(hivemindError));
        
        // Log with appropriate level
        if (classification.logLevel === 'error') {
            console.error('OpenAI completion error:', hivemindError);
        }
        
        throw ErrorUtils.createError(
            `Failed to generate completion: ${ErrorUtils.getMessage(hivemindError)}`,
            classification.type,
            'OPENAI_COMPLETION_ERROR',
            ErrorUtils.getStatusCode(hivemindError),
            { originalError: error }
        );
    }
}
