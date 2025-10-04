import { LLMResponse } from '@src/llm/interfaces/LLMResponse';

describe('LLMResponse', () => {
  it('should create response with all properties', () => {
    const response = new LLMResponse(
      'resp-123',
      'chat.completion',
      Date.now(),
      'gpt-4',
      [{ index: 0, message: { role: 'assistant', content: 'Test response' }, finish_reason: 'stop' }],
      { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      'Test response'
    );

    expect(response.getContent()).toBe('Test response');
    expect(response.getModel()).toBe('gpt-4');
    expect(response.getFinishReason()).toBe('completed');
  });

  it('should get basic properties', () => {
    const response = new LLMResponse(
      'resp-456',
      'chat.completion',
      1234567890,
      'gpt-3.5-turbo',
      [{ index: 0, message: { role: 'assistant', content: 'Hello' }, finish_reason: 'stop' }],
      { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 },
      'Hello'
    );

    expect(response.getId()).toBe('resp-456');
    expect(response.getModel()).toBe('gpt-3.5-turbo');
    expect(response.getContent()).toBe('Hello');
    expect(response.getUsage().total_tokens).toBe(7);
  });
});