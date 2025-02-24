import { ILlmProvider } from '@llm/interfaces/ILlmProvider';
import { IMessage } from '@message/interfaces/IMessage';
import { OpenAI } from 'openai';
import openaiConfig from '@config/openaiConfig';
import Debug from 'debug';

const debug = Debug('app:openAiProvider');

export const openAiProvider: ILlmProvider = {
  supportsChatCompletion: (): boolean => true,
  supportsCompletion: (): boolean => true,

  async generateChatCompletion(
    userMessage: string,
    historyMessages: IMessage[],
    metadata?: Record<string, any>
  ): Promise<string> {
    debug('Generating chat completion with OpenAI:', { userMessage, historyMessages, metadata });
    const openai = new OpenAI({
      apiKey: openaiConfig.get('OPENAI_API_KEY'),
      baseURL: openaiConfig.get('OPENAI_BASE_URL'),
      timeout: openaiConfig.get('OPENAI_TIMEOUT'),
      organization: openaiConfig.get('OPENAI_ORGANIZATION')
    });

    try {
      const response = await openai.chat.completions.create({
        model: openaiConfig.get('OPENAI_MODEL'),
        messages: [
          { role: 'system' as const, content: openaiConfig.get('OPENAI_SYSTEM_PROMPT') },
          ...historyMessages.map(msg => ({
            role: msg.role as 'user' | 'assistant' | 'system',
            content: msg.getText()
          })),
          { role: 'user' as const, content: userMessage }
        ],
        max_tokens: openaiConfig.get('OPENAI_MAX_TOKENS'),
        temperature: openaiConfig.get('OPENAI_TEMPERATURE'),
        frequency_penalty: openaiConfig.get('OPENAI_FREQUENCY_PENALTY'),
        presence_penalty: openaiConfig.get('OPENAI_PRESENCE_PENALTY'),
        top_p: openaiConfig.get('OPENAI_TOP_P'),
        stop: openaiConfig.get('OPENAI_STOP') || null  // Directly use array or null
      });
      return response.choices[0].message.content || '';
    } catch (error) {
      debug('Error generating chat completion:', error);
      throw new Error(`Chat completion failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  async generateCompletion(prompt: string): Promise<string> {
    debug('Generating non-chat completion with OpenAI:', { prompt });
    const openai = new OpenAI({
      apiKey: openaiConfig.get('OPENAI_API_KEY'),
      baseURL: openaiConfig.get('OPENAI_BASE_URL'),
      timeout: openaiConfig.get('OPENAI_TIMEOUT'),
      organization: openaiConfig.get('OPENAI_ORGANIZATION')
    });

    try {
      const response = await openai.completions.create({
        model: openaiConfig.get('OPENAI_MODEL'),
        prompt,
        max_tokens: openaiConfig.get('OPENAI_MAX_TOKENS'),
        temperature: openaiConfig.get('OPENAI_TEMPERATURE'),
        frequency_penalty: openaiConfig.get('OPENAI_FREQUENCY_PENALTY'),
        presence_penalty: openaiConfig.get('OPENAI_PRESENCE_PENALTY'),
        top_p: openaiConfig.get('OPENAI_TOP_P'),
        stop: openaiConfig.get('OPENAI_STOP') || null  // Directly use array or null
      });
      return response.choices[0].text || '';
    } catch (error) {
      debug('Error generating non-chat completion:', error);
      throw new Error(`Non-chat completion failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};
