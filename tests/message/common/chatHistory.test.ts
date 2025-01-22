import { ChatHistory } from '@message/common/chatHistory';

describe('ChatHistory', () => {
  it('should retrieve chat history', () => {
    const history = ChatHistory.getInstance();
    expect(history).toBeDefined();
  });
});