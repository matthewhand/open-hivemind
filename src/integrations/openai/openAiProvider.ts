import { IMessage } from '@src/message/interfaces/IMessage';
import axios from 'axios';
import Debug from 'debug';
const debug = Debug('app:openAiProvider');

/**
 * Determines if the model should use the chat completion API or the regular completion API.
 * This uses a config-driven approach to avoid hardcoding assumptions about model names.
 */
function isChatModel(): boolean {
  return process.env.OPENAI_IS_CHAT_MODEL === 'true'; // Read from the config to determine if it's a chat model
}

/**
 * OpenAI provider to generate responses based on full message history.
 * @param {string} userMessage - The latest user message.
 * @param {IMessage[]} historyMessages - The history of previous messages.
 * @returns {Promise<string>} The generated response from OpenAI.
 */
export async function getOpenAiProvider(userMessage: string, historyMessages: IMessage[]): Promise<string> {
  const messages = historyMessages.map(msg => ({ role: msg.isFromBot() ? 'assistant' : 'user', content: msg.getText() }));
  messages.push({ role: 'user', content: userMessage });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key is missing.');
  }

  const model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
  const url = isChatModel() ? 'https://api.openai.com/v1/chat/completions' : 'https://api.openai.com/v1/completions';

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

    return isChatModel() ? response.data.choices[0].message.content : response.data.choices[0].text;
  } catch (error) {
    throw new Error(`Error generating response from OpenAI: ${error.message}`);
  }
}
