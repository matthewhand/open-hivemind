import { getChatHistory } from '@message/common/chatHistory';

describe('ChatHistory', () => {
  it('should retrieve chat history', () => {
    const history = getChatHistory();
    expect(history).toBeDefined();
  });
});