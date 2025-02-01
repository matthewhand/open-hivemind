import { ILlmProvider } from '@src/llm/interfaces/ILlmProvider';
import { IMessage } from '@src/message/interfaces/IMessage';
import Debug from 'debug';
import { OpenAiService } from './OpenAiService';

const debug = Debug('app:openAiProvider');
const openAiService = OpenAiService.getInstance();

export const openAiProvider: ILlmProvider = {
  supportsChatCompletion: (): boolean => true,

  supportsCompletion: (): boolean => {
    debug('OpenAI supports non-chat completions: true');
    return true;
  },

  /**
   * Generates a chat completion using OpenAI's service.
   * If the environment variable OPENAI_INCLUDE_METADATA is set to 'true',
   * it extracts metadata (e.g. user, channel) from the last message in the history.
   */
  generateChatCompletion: async (
    userMessage: string,
    historyMessages: IMessage[]
  ): Promise<string> => {
    debug('Delegating chat completion to OpenAiService...');

    // Optionally include metadata if OPENAI_INCLUDE_METADATA is enabled.
    let metadata: Record<string, string> | undefined = undefined;
    if (process.env.OPENAI_INCLUDE_METADATA === 'true' && historyMessages.length > 0) {
      const lastMessage = historyMessages[historyMessages.length - 1];
      metadata = {
        user: lastMessage.getAuthorId(),
        channel: lastMessage.getChannelId(),
        // If your IMessage implementation supports additional getters (e.g. getThreadId, getTeamId),
        // you can include those as well. For example:
        // thread: lastMessage.getThreadId ? lastMessage.getThreadId() : '',
        // team: lastMessage.getTeamId ? lastMessage.getTeamId() : '',
      };
      debug('Including metadata in completion request:', metadata);
    }

    // If there are no history messages, create a dummy message.
    if (!historyMessages.length) {
      historyMessages = [{
        getText: () => userMessage,
        isFromBot: () => false,
        getAuthorId: () => 'unknown',
        getChannelId: () => 'unknown',
        getTimestamp: () => new Date(),
        setText: () => {},
        getChannelTopic: () => null,
        getUserMentions: () => [],
        getChannelUsers: () => [],
        getAuthorName: () => 'unknown',
        isReplyToBot: () => false,
      } as IMessage];
    }

    // Pass the metadata along with the request.
    const result = await openAiService.generateChatCompletion(userMessage, historyMessages, metadata);
    return result ?? 'No response generated.';
  },

  /**
   * Minimal implementation of generateCompletion to satisfy ILlmProvider.
   */
  generateCompletion: async (prompt: string): Promise<string> => {
    debug('Generating non-chat completion from OpenAI with prompt:', prompt);
    return `Completion for: ${prompt}`;  // Placeholder for now.
  },
};
