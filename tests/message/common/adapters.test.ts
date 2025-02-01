import { toCommonMessage, fromCommonMessage } from '@src/message/common/adapters';
import { ICommonMessage } from '@src/message/common/commonTypes';
import { IMessage } from '@src/message/interfaces/IMessage';

// Create a dummy implementation of IMessage for testing purposes.
class DummyMessage implements IMessage {
  content: string;
  channelId: string;
  data: any;
  role: string;
  private messageId: string;
  private timestamp: Date;
  private authorId: string;
  
  constructor(text: string, channelId: string, authorId: string, messageId: string) {
    this.content = text;
    this.channelId = channelId;
    this.data = text;
    this.role = 'user';
    this.authorId = authorId;
    this.messageId = messageId;
    this.timestamp = new Date();
  }
  
  getMessageId(): string {
    return this.messageId;
  }
  getText(): string {
    return this.content;
  }
  getTimestamp(): Date {
    return this.timestamp;
  }
  setText(text: string): void {
    this.content = text;
  }
  getChannelId(): string {
    return this.channelId;
  }
  getAuthorId(): string {
    return this.authorId;
  }
  getChannelTopic(): string | null {
    return null;
  }
  getUserMentions(): string[] {
    return [];
  }
  getChannelUsers(): string[] {
    return [];
  }
  mentionsUsers(userId: string): boolean {
    return false;
  }
  isFromBot(): boolean {
    return false;
  }
  isReplyToBot(): boolean {
    return false;
  }
  getAuthorName(): string {
    return 'Dummy Author';
  }
}

describe('Common Message Adapter', () => {
  const dummy = new DummyMessage('Hello world', 'channel-1', 'user-123', 'msg-001');

  test('toCommonMessage converts IMessage to ICommonMessage correctly', () => {
    const commonMsg: ICommonMessage = toCommonMessage(dummy);
    expect(commonMsg.text).toBe(dummy.getText());
    expect(commonMsg.channelId).toBe(dummy.getChannelId());
    expect(commonMsg.senderId).toBe(dummy.getAuthorId());
    expect(commonMsg.timestamp).toBeInstanceOf(Date);
    // You can extend this test if UI elements conversion is added later.
  });

  test('fromCommonMessage converts ICommonMessage back to partial IMessage format', () => {
    const commonMsg: ICommonMessage = {
      text: 'Test message',
      channelId: 'channel-2',
      senderId: 'user-456',
      timestamp: new Date(),
      uiElements: [{ type: 'text', text: 'Extra UI text' }]
    };
    const partialMsg = fromCommonMessage(commonMsg);
    expect(partialMsg.content).toBe(commonMsg.text);
    expect(partialMsg.channelId).toBe(commonMsg.channelId);
    // Further conversion logic can be tested here when implemented.
  });
});
