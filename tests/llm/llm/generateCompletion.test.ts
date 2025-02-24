import { generateCompletion } from '@llm/llm/generateCompletion';
import { IMessage } from '@message/interfaces/IMessage';

// Mock IMessage implementation
class MockMessage implements IMessage {
  public content: string;
  public channelId: string = 'mock-channel';
  public data: any = {};
  public role: string;

  constructor(content: string, role: string) {
    this.content = content;
    this.role = role;
  }

  getMessageId(): string { return 'mock-id'; }
  getText(): string { return this.content; }
  getTimestamp(): Date { return new Date(); }
  setText(text: string): void { this.content = text; }
  getChannelId(): string { return this.channelId; }
  getAuthorId(): string { return 'mock-author'; }
  getChannelTopic(): string | null { return null; }
  getUserMentions(): string[] { return []; }
  getChannelUsers(): string[] { return []; }
  mentionsUsers(userId: string): boolean { return false; }
  isFromBot(): boolean { return false; }
  getAuthorName(): string { return 'Mock User'; }
  isReplyToBot(): boolean { return false; }
}

// Mock messages array
const mockMessages: IMessage[] = [
  new MockMessage('You are Grok, created by xAI.', 'system'),
  new MockMessage('Hello, Grok!', 'user')
];

import * as getLlmProviderModule from '@src/llm/getLlmProvider';

jest.mock('@src/llm/getLlmProvider', () => ({
  getLlmProvider: jest.fn(() => ([{
    generateChatCompletion: jest.fn(() => Promise.resolve('Hi there!'))
  }]))
}));

describe('generateCompletion', () => {
  it('should send completions for given messages', async () => {
    const result = await generateCompletion('Hello, Grok!', mockMessages, {});
    expect(result).toBe('Hi there!');
    expect(getLlmProviderModule.getLlmProvider).toHaveBeenCalled();
  });
});
