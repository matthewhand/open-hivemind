import LLMResponse from '../../../src/llm/interfaces/LLMResponse';

describe('LLMResponse', () => {
  it('should define the necessary properties', () => {
    const response: LLMResponse = new LLMResponse(
      'test-id',
      'test-object',
      1672531199,
      'test-model',
      [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: 'test-content',
          },
          finish_reason: 'stop',
        },
      ],
      {
        prompt_tokens: 10,
        completion_tokens: 20,
        total_tokens: 30,
      },
      'test-content',
      'completed',
      0
    );

    expect(response.getId()).toBe('test-id');
    expect(response.getObject()).toBe('test-object');
    expect(response.getCreated()).toBe(1672531199);
    expect(response.getModel()).toBe('test-model');
    expect(response.getChoices()).toEqual([
      {
        index: 0,
        message: {
          role: 'assistant',
          content: 'test-content',
        },
        finish_reason: 'stop',
      },
    ]);
    expect(response.getUsage()).toEqual({
      prompt_tokens: 10,
      completion_tokens: 20,
      total_tokens: 30,
    });
  });

  // Add more tests as necessary
});