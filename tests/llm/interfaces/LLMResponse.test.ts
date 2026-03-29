import LLMResponse from '../../../src/llm/interfaces/LLMResponse';

describe('LLMResponse', () => {
  describe('Construction with edge-case inputs', () => {
    it('should not throw when constructed with null/undefined values', () => {
      expect(() => {
        new LLMResponse(
          null as any,
          undefined as any,
          0,
          '',
          [],
          { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
          null as any,
          undefined as any,
          null as any
        );
      }).not.toThrow();
    });

    it('should not throw when constructed with missing usage properties', () => {
      const invalidUsage = {} as any;

      expect(() => {
        new LLMResponse(
          'invalid-usage-test',
          'chat.completion',
          Date.now(),
          'gpt-4',
          [],
          invalidUsage,
          '',
          'completed',
          0
        );
      }).not.toThrow();
    });
  });

  describe('Immutability', () => {
    it('should not allow modification of choices array via push', () => {
      const response = new LLMResponse(
        'immutable-test',
        'chat.completion',
        Date.now(),
        'gpt-4',
        [
          { index: 0, message: { role: 'assistant', content: 'original' }, finish_reason: 'stop' },
        ],
        { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
        'original',
        'completed',
        100
      );

      const choices = response.getChoices();
      choices.push({
        index: 1,
        message: { role: 'user', content: 'modified' },
        finish_reason: 'stop',
      });

      expect(response.getChoices()).toHaveLength(1);
      expect(response.getChoices()[0].message.content).toBe('original');
    });

    it('should not allow modification of choices message content', () => {
      const response = new LLMResponse(
        'deep-immutable-test',
        'chat.completion',
        Date.now(),
        'gpt-4',
        [
          { index: 0, message: { role: 'assistant', content: 'original' }, finish_reason: 'stop' },
        ],
        { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
        'original',
        'completed',
        100
      );

      const choices = response.getChoices();
      choices[0].message.content = 'tampered';

      expect(response.getChoices()[0].message.content).toBe('original');
    });

    it('should not allow modification of usage object', () => {
      const response = new LLMResponse(
        'usage-immutable-test',
        'chat.completion',
        Date.now(),
        'gpt-4',
        [],
        { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
        '',
        'completed',
        100
      );

      const usage = response.getUsage();
      usage.total_tokens = 999999;

      expect(response.getUsage().total_tokens).toBe(20);
    });
  });

  describe('getContent and getFinishReason and getCompletionTokens', () => {
    it('should return content, finish_reason, and completion_tokens', () => {
      const response = new LLMResponse(
        'id',
        'chat.completion',
        1672531199,
        'gpt-4',
        [],
        { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
        'response content',
        'stop',
        42
      );

      expect(response.getContent()).toBe('response content');
      expect(response.getFinishReason()).toBe('stop');
      expect(response.getCompletionTokens()).toBe(42);
    });

    it('should use default values for finish_reason and completion_tokens', () => {
      const response = new LLMResponse(
        'id',
        'chat.completion',
        1672531199,
        'gpt-4',
        [],
        { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        ''
      );

      expect(response.getFinishReason()).toBe('completed');
      expect(response.getCompletionTokens()).toBe(0);
    });
  });
});
