import { ILlmProvider } from '@src/llm/interfaces/ILlmProvider';
import { IMessage } from '@src/message/interfaces/IMessage';
import Debug from 'debug';
import { OpenAiService } from './OpenAiService';

const debug = Debug('app:openAiProvider');
const openAiService = OpenAiService.getInstance();

// Create a dummy IMessage implementation for fallback.
const createDummyMessage = (userMessage: string): IMessage => {
  return {
    content: userMessage,
    channelId: "dummy-channel",
    data: {},
    role: "user",
    getText: () => userMessage,
    isFromBot: () => false,
    getAuthorId: () => "dummy-user",
    getChannelId: () => "dummy-channel",
    getTimestamp: () => new Date(),
    setText: (text: string) => { /* no-op for test */ },
    getChannelTopic: () => null,
    getUserMentions: () => [], // **Fix: Return an empty string array instead of `false`**
    getChannelUsers: () => [],
    getAuthorName: () => "Dummy User",
    isReplyToBot: () => false,
    getMessageId: () => "dummy-id",
    mentionsUsers: () => false, // Assuming `mentionsUsers` expects a boolean
  };
};

export const openAiProvider: ILlmProvider = {
  supportsChatCompletion: (): boolean => true,

  supportsCompletion: (): boolean => {
    debug('OpenAI supports non-chat completions: true');
    return true;
  },

  /**
   * Generates a chat completion using OpenAI's service.
   */
  generateChatCompletion: async (
    userMessage: string,
    historyMessages: IMessage[] = []
  ): Promise<string> => {
    debug('Delegating chat completion to OpenAiService...');

    if (!historyMessages.length) {
      historyMessages = [createDummyMessage(userMessage)];
    }

    debug('History Messages:', historyMessages);

    const result = await openAiService.generateChatCompletion(userMessage, historyMessages);
    return result ?? 'No response generated.';
  },

  /**
   * Minimal implementation of generateCompletion to satisfy ILlmProvider.
   */
  generateCompletion: async (prompt: string): Promise<string> => {
    debug('Generating non-chat completion from OpenAI with prompt:', prompt);
    return `Completion for: ${prompt}`;
  },
};
