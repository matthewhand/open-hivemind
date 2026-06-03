/**
 * Unit tests for {@link LlmInvokerAdapter}.
 *
 * Focus: the adapter must resolve the LLM provider from the **per-message**
 * bot config passed to `generateResponse()` (i.e. `ctx.botConfig` flowing from
 * the pipeline), not the (possibly empty) fallback config captured at
 * construction time. This guards the pipeline-botconfig regression where
 * `createPipeline` was wired with `botConfig: {}`.
 */

import { LlmInvokerAdapter } from '@src/pipeline/adapters/LlmInvokerAdapter';
import * as getLlmProvider from '@src/llm/getLlmProvider';
import type { ILlmProvider } from '@llm/interfaces/ILlmProvider';

describe('LlmInvokerAdapter', () => {
  let provider: ILlmProvider;
  let spy: jest.SpyInstance;

  beforeEach(() => {
    provider = {
      name: 'mock',
      supportsChatCompletion: true,
      supportsCompletion: false,
      supportsHistory: true,
      generateChatCompletion: jest.fn().mockResolvedValue('mock response'),
      generateCompletion: jest.fn().mockResolvedValue('mock response'),
    } as unknown as ILlmProvider;

    spy = jest
      .spyOn(getLlmProvider, 'getLlmProviderForBot')
      .mockResolvedValue(provider);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('resolves the provider from the per-message botConfig, not the construction-time fallback', async () => {
    // Construction-time fallback is empty (mirrors createPipeline's `botConfig: {}`).
    const adapter = new LlmInvokerAdapter({ botConfig: {} });

    const perMessageConfig = {
      name: 'BotA',
      llmProvider: 'openai',
      openai: { apiKey: 'sk-bot-a', model: 'gpt-4o' },
    };

    await adapter.generateResponse('hi', [], 'system', {}, perMessageConfig);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(perMessageConfig);
    // Ensure it did NOT use the empty fallback.
    expect(spy).not.toHaveBeenCalledWith({});
  });

  it('falls back to the construction-time botConfig when no per-message config is supplied', async () => {
    const fallbackConfig = { name: 'FallbackBot', llmProvider: 'openai' };
    const adapter = new LlmInvokerAdapter({ botConfig: fallbackConfig });

    await adapter.generateResponse('hi', [], 'system');

    expect(spy).toHaveBeenCalledWith(fallbackConfig);
  });

  it('falls back when an empty per-message config is supplied', async () => {
    const fallbackConfig = { name: 'FallbackBot' };
    const adapter = new LlmInvokerAdapter({ botConfig: fallbackConfig });

    await adapter.generateResponse('hi', [], 'system', {}, {});

    expect(spy).toHaveBeenCalledWith(fallbackConfig);
  });

  it('forwards the system prompt and metadata to the resolved provider', async () => {
    const adapter = new LlmInvokerAdapter({ botConfig: {} });

    await adapter.generateResponse('hello', [], 'be helpful', { foo: 'bar' }, { name: 'BotB' });

    expect(provider.generateChatCompletion).toHaveBeenCalledWith('hello', [], {
      foo: 'bar',
      systemPrompt: 'be helpful',
    });
  });
});
