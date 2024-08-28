import OpenAI from 'openai';
import ConfigurationManager from '@src/common/config/ConfigurationManager';
import Debug from 'debug';

const debug = Debug('app:summarizeText');

/**
 * Summarizes text using OpenAI's GPT model.
 * 
 * @param text - The text to summarize.
 * @returns A promise resolving to the summary.
 */
export async function summarizeText(text: string): Promise<string> {
    const openai = new OpenAI({
        apiKey: ConfigurationManager.OPENAI_API_KEY,
        baseURL: ConfigurationManager.OPENAI_BASE_URL
    });

    debug('Summarizing text: ' + text);

    const response = await openai.chat.completions.create({
        model: ConfigurationManager.OPENAI_MODEL,
        messages: [
            { role: 'system', content: 'Summarize the following text.' },
            { role: 'user', content: text },
        ],
        max_tokens: ConfigurationManager.OPENAI_MAX_TOKENS,
    });

    const summary = response.choices[0]?.message?.content || '';
    debug('Generated summary: ' + summary);

    return summary;
}
