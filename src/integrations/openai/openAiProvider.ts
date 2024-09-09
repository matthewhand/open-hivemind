import { ILlmProvider } from '@src/llm/interfaces/ILlmProvider';
import { IMessage } from '@src/message/interfaces/IMessage';
import axios from 'axios';
import Debug from 'debug';

const debug = Debug('app:openAiProvider');

function isChatModel(): boolean {
  const isChat = process.env.OPENAI_IS_CHAT_MODEL === 'true';
  debug(`isChatModel: ${isChat}`);
  return isChat;
}

export const openAiProvider: ILlmProvider = {
  supportsNonChat: () => {
    debug('OpenAI supports non-chat completions: true');
    return true;
  },

  generateResponse: async (historyMessages: IMessage[], userMessage: string): Promise<string> => {
    debug('Generating response from OpenAI with userMessage:', userMessage);

    const messages = historyMessages.map(msg => ({
      role: msg.isFromBot() ? 'assistant' : 'user',
      content: msg.getText(),
    }));
    messages.push({ role: 'user', content: userMessage });

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key is missing.');
    }

    const model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
    const url = isChatModel() 
      ? 'https://api.openai.com/v1/chat/completions'
      : 'https://api.openai.com/v1/completions';

    debug(`Using OpenAI model: ${model}`);
    debug(`OpenAI API endpoint: ${url}`);

    try {
      const response = await axios.post(
        url,
        {
          model,
          messages: isChatModel() ? messages : undefined,
          prompt: !isChatModel() ? messages.map(msg => msg.content).join('\n') : undefined,
        },
        { headers: { Authorization: `Bearer ${apiKey}` } }
      );

      const generatedText = isChatModel()
        ? response.data.choices[0].message.content
        : response.data.choices[0].text;

      debug('Generated response from OpenAI:', generatedText);
      return generatedText;
    } catch (error: unknown) {
      if (error instanceof Error) {
        debug(`Error generating response from OpenAI: ${error.message}`);
        throw new Error(`Error generating response from OpenAI: ${error.message}`);
      }
      debug('Unknown error generating response from OpenAI');
      throw new Error('Unknown error generating response from OpenAI');
    }
  }
};
