import { describe, it } from 'mocha';
import { expect } from 'chai';
import { createChatCompletion } from './createChatCompletion';
import { IMessage } from '@src/message/interfaces/IMessage';

// Mock IMessage with required fields
const mockMessage: IMessage = {
  role: 'user',
  content: 'Hello',
  getAuthorId: () => 'user123',
  client: {},
  channelId: '1234',
  data: {},
  getMessageId: () => '5678',
  getTimestamp: () => new Date(),
};

// Mock dependencies
const mockOpenAI = {
  chat: {
    completions: {
      create: async () => ({ choices: [{ message: { content: 'mock response' } }] }),
    },
  },
};

describe('createChatCompletion', () => {
  it('should return a valid completion response', async () => {
    const response = await createChatCompletion(
      mockOpenAI as any,
      [mockMessage],
      'system message',
      100
    );
    expect(response).to.equal('mock response');
  });

  it('should handle an empty completion response', async () => {
    const mockEmptyOpenAI = {
      chat: {
        completions: {
          create: async () => ({ choices: [] }),
        },
      },
    };
    const response = await createChatCompletion(
      mockEmptyOpenAI as any,
      [mockMessage],
      'system message',
      100
    );
    expect(response).to.equal('');
  });
});
