import { describe, it } from 'mocha';
import { expect } from 'chai';
import { createChatCompletion } from './createChatCompletion';

// Mock dependencies
const mockOpenAI = {
  chat: {
    completions: {
      create: async () => ({ choices: [{ message: { content: 'mock response' } }] }),
    },
  },
};

// Test suite for createChatCompletion
describe('createChatCompletion', () => {
  it('should return a valid completion response', async () => {
    const response = await createChatCompletion(
      mockOpenAI as any,
      [{ role: 'user', content: 'Hello', getAuthorId: () => 'user123' }],
      'system message',
      100
    );
    expect(response).to.equal('mock response');
  });

  // Fix: Handle null case appropriately
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
      [{ role: 'user', content: 'Hello', getAuthorId: () => 'user123' }],
      'system message',
      100
    );
    expect(response).to.equal('');
  });
});
