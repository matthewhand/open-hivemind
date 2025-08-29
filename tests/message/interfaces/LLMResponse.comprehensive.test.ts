import { LLMResponse } from '@src/llm/interfaces/LLMResponse';

describe.skip('LLMResponse Comprehensive', () => {
  it('should create response with all properties', () => {
    const response = new LLMResponse(
      'Test response',
      { model: 'gpt-4', tokens: 100 },
      'success',
      undefined,
      { requestId: '123' }
    );

    expect(response.content).toBe('Test response');
    expect(response.metadata?.model).toBe('gpt-4');
    expect(response.status).toBe('success');
    expect(response.additionalData?.requestId).toBe('123');
  });

  it('should create response with minimal properties', () => {
    const response = new LLMResponse('Simple response');

    expect(response.content).toBe('Simple response');
    expect(response.metadata).toBeUndefined();
    expect(response.status).toBeUndefined();
    expect(response.error).toBeUndefined();
    expect(response.additionalData).toBeUndefined();
  });

  it('should handle error responses', () => {
    const error = new Error('API Error');
    const response = new LLMResponse('', undefined, 'error', error);

    expect(response.content).toBe('');
    expect(response.status).toBe('error');
    expect(response.error).toBe(error);
  });

  it('should handle streaming responses', () => {
    const response = new LLMResponse(
      'Streaming content',
      { streaming: true, chunks: 5 },
      'streaming'
    );

    expect(response.content).toBe('Streaming content');
    expect(response.metadata?.streaming).toBe(true);
    expect(response.status).toBe('streaming');
  });

  it('should handle large content', () => {
    const largeContent = 'x'.repeat(10000);
    const response = new LLMResponse(largeContent);

    expect(response.content).toBe(largeContent);
    expect(response.content.length).toBe(10000);
  });

  it('should handle unicode content', () => {
    const unicodeContent = '🚀 Hello 世界 🌍';
    const response = new LLMResponse(unicodeContent);

    expect(response.content).toBe(unicodeContent);
  });

  it('should handle complex metadata', () => {
    const complexMetadata = {
      model: 'gpt-4',
      tokens: { input: 50, output: 100, total: 150 },
      timing: { start: Date.now(), end: Date.now() + 1000 },
      provider: 'openai',
      version: '1.0.0'
    };

    const response = new LLMResponse('Test', complexMetadata);

    expect(response.metadata).toEqual(complexMetadata);
  });

  it('should be serializable to JSON', () => {
    const response = new LLMResponse(
      'Test response',
      { model: 'gpt-4' },
      'success'
    );

    const json = JSON.stringify(response);
    const parsed = JSON.parse(json);

    expect(parsed.content).toBe('Test response');
    expect(parsed.metadata.model).toBe('gpt-4');
    expect(parsed.status).toBe('success');
  });
});