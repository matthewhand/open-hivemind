import { ILlmProvider } from "@src/llm/interfaces/ILlmProvider";
import { IMessage } from "@src/message/interfaces/IMessage";
import { FlowiseClient } from "flowise-sdk";
import Debug from "debug";
import flowiseConfig from "@integrations/flowise/interfaces/flowiseConfig";
import fs from "fs";
import path from "path";

const debug = Debug("app:flowiseProvider");

const flowiseClient = new FlowiseClient({
  baseUrl: flowiseConfig.get("FLOWISE_API_ENDPOINT")
});

/**
 * Reads Flowise API key from ~/.flowise/api.json and returns it if not provided in the environment.
 * @returns {Promise<string | null>} The Flowise API key, or null if unavailable.
 */
async function getFlowiseApiKey(): Promise<string | null> {
  try {
    const apiFilePath = path.join(process.env.HOME || '', '.flowise', 'api.json');
    if (!fs.existsSync(apiFilePath)) {
      debug('Flowise API config file not found at:', apiFilePath);
      return null;
    }
    const apiData = JSON.parse(fs.readFileSync(apiFilePath, 'utf8'));
    const apiKey = apiData[0]?.apiKey;
    if (!apiKey) {
      debug('Flowise API key not found in the config file.');
      return null;
    }
    debug('Successfully read Flowise API key.');
    return apiKey;
  } catch (error) {
    if (error instanceof Error) {
      debug('Error reading Flowise API key:', error.message);
    } else {
      debug('Unknown error occurred while reading Flowise API key.');
    }
    return null;
  }
}

/**
 * Flowise provider implementation.
 * This provider supports both chat completions and single-turn completions.
 */
export const flowiseProvider: ILlmProvider = {
  supportsChatCompletion: () => true,
  supportsCompletion: () => true,

  /**
   * Generates a chat-based completion using the Flowise SDK.
   * Uses the conversation chatflow ID to handle multi-turn conversations.
   * @param {IMessage[]} historyMessages - The message history to send to Flowise.
   * @returns {Promise<string>} The generated response from Flowise.
   */
  generateChatCompletion: async (historyMessages: IMessage[]): Promise<string> => {
    debug('Generating chat-based response from Flowise with message history size:', historyMessages.length);
    const conversationChatflowId = flowiseConfig.get('FLOWISE_CONVERSATION_CHATFLOW_ID');
    const userMessage = historyMessages[historyMessages.length - 1].getText();
    try {
      const completion = await flowiseClient.createPrediction({
        chatflowId: conversationChatflowId,
        question: userMessage,
        streaming: false
      });
      let responseText = '';
      const responseText = completion.text;
        responseText += chunk;
      }
      debug('Generated chat-based response from Flowise SDK:', responseText);
      return responseText;
    } catch (error) {
      debug('Error generating chat-based response from Flowise SDK:', error instanceof Error ? error.message : 'Unknown error');
      throw new Error('Failed to generate chat-based response from Flowise SDK.');
    }
  },

  /**
   * Generates a non-chat (single-turn) completion using the Flowise SDK.
   * Uses the single-turn completion chatflow ID.
   * @param {string} prompt - The prompt to send to Flowise.
   * @returns {Promise<string>} The generated response from Flowise.
   */
  generateCompletion: async (prompt: string): Promise<string> => {
    debug('Generating single-turn completion from Flowise with prompt:', prompt);
    const completionChatflowId = flowiseConfig.get('FLOWISE_COMPLETION_CHATFLOW_ID');
    try {
      const completion = await flowiseClient.createPrediction({
        chatflowId: completionChatflowId,
        question: prompt,
        streaming: false
      });
      let responseText = '';
      const responseText = completion.text;
        responseText += chunk;
      }
      debug('Generated single-turn completion from Flowise SDK:', responseText);
      return responseText;
    } catch (error) {
      debug('Error generating single-turn completion from Flowise SDK:', error instanceof Error ? error.message : 'Unknown error');
      throw new Error('Failed to generate single-turn completion from Flowise SDK.');
    }
  }
};
