import LLMResponse from '../../../src/llm/interfaces/LLMResponse';

describe('LLMResponse', () => {
  describe('Constructor and basic properties', () => {
    it('should create instance with all required properties', () => {
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

    it('should handle minimal constructor parameters', () => {
      const response = new LLMResponse(
        'minimal-id',
        'chat.completion',
        Date.now(),
        'gpt-3.5-turbo',
        [],
        { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        '',
        'pending',
        0
      );

      expect(response.getId()).toBe('minimal-id');
      expect(response.getObject()).toBe('chat.completion');
      expect(response.getModel()).toBe('gpt-3.5-turbo');
      expect(response.getChoices()).toEqual([]);
      expect(response.getUsage().total_tokens).toBe(0);
    });

    it('should handle constructor with null/undefined values gracefully', () => {
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
  });

  describe('Getter methods', () => {
    let response: LLMResponse;

    beforeEach(() => {
      response = new LLMResponse(
        'test-id-123',
        'chat.completion',
        1672531199,
        'gpt-4',
        [
          {
            index: 0,
            message: { role: 'assistant', content: 'Hello world' },
            finish_reason: 'stop',
          },
        ],
        { prompt_tokens: 15, completion_tokens: 25, total_tokens: 40 },
        'Hello world',
        'completed',
        500
      );
    });

    it('should return correct ID', () => {
      expect(response.getId()).toBe('test-id-123');
      expect(typeof response.getId()).toBe('string');
    });

    it('should return correct object type', () => {
      expect(response.getObject()).toBe('chat.completion');
      expect(typeof response.getObject()).toBe('string');
    });

    it('should return correct creation timestamp', () => {
      expect(response.getCreated()).toBe(1672531199);
      expect(typeof response.getCreated()).toBe('number');
    });

    it('should return correct model name', () => {
      expect(response.getModel()).toBe('gpt-4');
      expect(typeof response.getModel()).toBe('string');
    });

    it('should return choices array', () => {
      const choices = response.getChoices();
      expect(Array.isArray(choices)).toBe(true);
      expect(choices).toHaveLength(1);
      expect(choices[0].index).toBe(0);
      expect(choices[0].message.role).toBe('assistant');
      expect(choices[0].message.content).toBe('Hello world');
      expect(choices[0].finish_reason).toBe('stop');
    });

    it('should return usage statistics', () => {
      const usage = response.getUsage();
      expect(typeof usage).toBe('object');
      expect(usage.prompt_tokens).toBe(15);
      expect(usage.completion_tokens).toBe(25);
      expect(usage.total_tokens).toBe(40);
    });
  });

  describe('Multiple choices handling', () => {
    it('should handle multiple choices correctly', () => {
      const multiChoiceResponse = new LLMResponse(
        'multi-choice-id',
        'chat.completion',
        Date.now(),
        'gpt-4',
        [
          {
            index: 0,
            message: { role: 'assistant', content: 'First choice' },
            finish_reason: 'stop',
          },
          {
            index: 1,
            message: { role: 'assistant', content: 'Second choice' },
            finish_reason: 'stop',
          },
          {
            index: 2,
            message: { role: 'assistant', content: 'Third choice' },
            finish_reason: 'length',
          },
        ],
        { prompt_tokens: 20, completion_tokens: 60, total_tokens: 80 },
        'First choice',
        'completed',
        1000
      );

      const choices = multiChoiceResponse.getChoices();
      expect(choices).toHaveLength(3);
      expect(choices[0].message.content).toBe('First choice');
      expect(choices[1].message.content).toBe('Second choice');
      expect(choices[2].message.content).toBe('Third choice');
      expect(choices[2].finish_reason).toBe('length');
    });

    it('should handle empty choices array', () => {
      const emptyChoicesResponse = new LLMResponse(
        'empty-id',
        'chat.completion',
        Date.now(),
        'gpt-3.5-turbo',
        [],
        { prompt_tokens: 10, completion_tokens: 0, total_tokens: 10 },
        '',
        'error',
        0
      );

      expect(emptyChoicesResponse.getChoices()).toEqual([]);
      expect(emptyChoicesResponse.getChoices()).toHaveLength(0);
    });
  });

  describe('Different message roles and content types', () => {
    it('should handle different message roles', () => {
      const roles = ['assistant', 'user', 'system', 'function'];

      roles.forEach((role, index) => {
        const response = new LLMResponse(
          `role-test-${index}`,
          'chat.completion',
          Date.now(),
          'gpt-4',
          [
            {
              index: 0,
              message: { role: role as any, content: `Content for ${role}` },
              finish_reason: 'stop',
            },
          ],
          { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
          `Content for ${role}`,
          'completed',
          100
        );

        expect(response.getChoices()[0].message.role).toBe(role);
        expect(response.getChoices()[0].message.content).toBe(`Content for ${role}`);
      });
    });

    it('should handle different finish reasons', () => {
      const finishReasons = ['stop', 'length', 'function_call', 'content_filter'];

      finishReasons.forEach((reason, index) => {
        const response = new LLMResponse(
          `finish-test-${index}`,
          'chat.completion',
          Date.now(),
          'gpt-4',
          [
            {
              index: 0,
              message: { role: 'assistant', content: 'Test content' },
              finish_reason: reason as any,
            },
          ],
          { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
          'Test content',
          'completed',
          100
        );

        expect(response.getChoices()[0].finish_reason).toBe(reason);
      });
    });

    it('should handle empty and special content', () => {
      const contentTypes = ['', '   ', '\n\t', '🚀 Emoji content', 'Multi\nline\ncontent'];

      contentTypes.forEach((content, index) => {
        const response = new LLMResponse(
          `content-test-${index}`,
          'chat.completion',
          Date.now(),
          'gpt-4',
          [
            {
              index: 0,
              message: { role: 'assistant', content },
              finish_reason: 'stop',
            },
          ],
          { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
          content,
          'completed',
          100
        );

        expect(response.getChoices()[0].message.content).toBe(content);
      });
    });
  });

  describe('Usage statistics validation', () => {
    it('should handle various usage statistics', () => {
      const usageScenarios = [
        { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
        { prompt_tokens: 1000, completion_tokens: 2000, total_tokens: 3000 },
        { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      ];

      usageScenarios.forEach((usage, index) => {
        const response = new LLMResponse(
          `usage-test-${index}`,
          'chat.completion',
          Date.now(),
          'gpt-4',
          [{ index: 0, message: { role: 'assistant', content: 'test' }, finish_reason: 'stop' }],
          usage,
          'test',
          'completed',
          100
        );

        const responseUsage = response.getUsage();
        expect(responseUsage.prompt_tokens).toBe(usage.prompt_tokens);
        expect(responseUsage.completion_tokens).toBe(usage.completion_tokens);
        expect(responseUsage.total_tokens).toBe(usage.total_tokens);
      });
    });

    it('should handle missing or invalid usage properties', () => {
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

  describe('Edge cases and error handling', () => {
    it('should handle very large token counts', () => {
      const largeUsage = {
        prompt_tokens: 1000000,
        completion_tokens: 2000000,
        total_tokens: 3000000,
      };

      const response = new LLMResponse(
        'large-tokens-test',
        'chat.completion',
        Date.now(),
        'gpt-4',
        [{ index: 0, message: { role: 'assistant', content: 'test' }, finish_reason: 'stop' }],
        largeUsage,
        'test',
        'completed',
        10000
      );

      expect(response.getUsage().total_tokens).toBe(3000000);
    });

    it('should handle negative timestamps', () => {
      const response = new LLMResponse(
        'negative-timestamp-test',
        'chat.completion',
        -1,
        'gpt-4',
        [],
        { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        '',
        'completed',
        0
      );

      expect(response.getCreated()).toBe(-1);
    });

    it('should handle very long strings', () => {
      const longString = 'a'.repeat(10000);
      const response = new LLMResponse(
        longString,
        longString,
        Date.now(),
        longString,
        [{ index: 0, message: { role: 'assistant', content: longString }, finish_reason: 'stop' }],
        { prompt_tokens: 10000, completion_tokens: 10000, total_tokens: 20000 },
        longString,
        'completed',
        5000
      );

      expect(response.getId()).toBe(longString);
      expect(response.getModel()).toBe(longString);
      expect(response.getChoices()[0].message.content).toBe(longString);
    });

    it('should handle special characters in strings', () => {
      const specialChars = '!@#$%^&*()_+-={}[]|\\:";\'<>?,./~`';
      const response = new LLMResponse(
        specialChars,
        'chat.completion',
        Date.now(),
        specialChars,
        [
          {
            index: 0,
            message: { role: 'assistant', content: specialChars },
            finish_reason: 'stop',
          },
        ],
        { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
        specialChars,
        'completed',
        100
      );

      expect(response.getId()).toBe(specialChars);
      expect(response.getModel()).toBe(specialChars);
      expect(response.getChoices()[0].message.content).toBe(specialChars);
    });
  });

  describe('Immutability and data integrity', () => {
    it('should not allow modification of choices array', () => {
      const originalChoices = [
        { index: 0, message: { role: 'assistant', content: 'original' }, finish_reason: 'stop' },
      ];

      const response = new LLMResponse(
        'immutable-test',
        'chat.completion',
        Date.now(),
        'gpt-4',
        originalChoices,
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
      } as any);

      // Original response should remain unchanged
      expect(response.getChoices()).toHaveLength(1);
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

      // Original response should remain unchanged
      expect(response.getUsage().total_tokens).toBe(20);
    });

    it('should maintain data consistency across multiple calls', () => {
      const response = new LLMResponse(
        'consistency-test',
        'chat.completion',
        1672531199,
        'gpt-4',
        [
          {
            index: 0,
            message: { role: 'assistant', content: 'consistent' },
            finish_reason: 'stop',
          },
        ],
        { prompt_tokens: 15, completion_tokens: 25, total_tokens: 40 },
        'consistent',
        'completed',
        500
      );

      // Multiple calls should return identical results
      for (let i = 0; i < 10; i++) {
        expect(response.getId()).toBe('consistency-test');
        expect(response.getCreated()).toBe(1672531199);
        expect(response.getChoices()[0].message.content).toBe('consistent');
        expect(response.getUsage().total_tokens).toBe(40);
      }
    });
  });

  describe('Performance characteristics', () => {
    it('should handle rapid successive property access', () => {
      const response = new LLMResponse(
        'performance-test',
        'chat.completion',
        Date.now(),
        'gpt-4',
        [{ index: 0, message: { role: 'assistant', content: 'test' }, finish_reason: 'stop' }],
        { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
        'test',
        'completed',
        100
      );

      const startTime = Date.now();
      for (let i = 0; i < 1000; i++) {
        response.getId();
        response.getModel();
        response.getChoices();
        response.getUsage();
      }
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(1000); // Should complete 4000 operations in under 1 second
    });

    it('should be memory efficient with large datasets', () => {
      const largeChoices = Array(1000)
        .fill(null)
        .map((_, index) => ({
          index,
          message: { role: 'assistant', content: `Response ${index}` },
          finish_reason: 'stop',
        }));

      const response = new LLMResponse(
        'large-dataset-test',
        'chat.completion',
        Date.now(),
        'gpt-4',
        largeChoices as any,
        { prompt_tokens: 10000, completion_tokens: 50000, total_tokens: 60000 },
        'Response 0',
        'completed',
        30000
      );

      expect(response.getChoices()).toHaveLength(1000);
      expect(response.getChoices()[999].message.content).toBe('Response 999');
    });
  });
});
