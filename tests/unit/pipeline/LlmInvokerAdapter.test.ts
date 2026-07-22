/**
 * Unit tests for {@link LlmInvokerAdapter}.
 *
 * Focus: the adapter must resolve the LLM provider from the **per-message**
 * bot config passed to `generateResponse()` (i.e. `ctx.botConfig` flowing from
 * the pipeline), not the (possibly empty) fallback config captured at
 * construction time. This guards the pipeline-botconfig regression where
 * `createPipeline` was wired with `botConfig: {}`.
 *
 * Also verifies tool-augmented completion is preferred, with plain
 * generateChatCompletion as the failure fallback.
 */

import type { ILlmProvider } from '@hivemind/shared-types';
import * as getLlmProvider from '@src/llm/getLlmProvider';
import { LlmInvokerAdapter } from '@src/pipeline/adapters/LlmInvokerAdapter';
import * as toolAugmented from '@src/services/toolAugmentedCompletion';

describe('LlmInvokerAdapter', () => {
  let provider: ILlmProvider;
  let spy: jest.SpyInstance;
  let toolSpy: jest.SpyInstance;

  beforeEach(() => {
    provider = {
      name: 'mock',
      supportsChatCompletion: true,
      supportsCompletion: false,
      supportsHistory: true,
      generateChatCompletion: jest.fn().mockResolvedValue('mock response'),
      generateCompletion: jest.fn().mockResolvedValue('mock response'),
    } as unknown as ILlmProvider;

    spy = jest.spyOn(getLlmProvider, 'getLlmProviderForBot').mockResolvedValue(provider);

    toolSpy = jest
      .spyOn(toolAugmented, 'toolAugmentedCompletion')
      .mockResolvedValue('tool response');
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

  it('uses toolAugmentedCompletion with bot name, system prompt, and tool context', async () => {
    const adapter = new LlmInvokerAdapter({ botConfig: {} });

    const result = await adapter.generateResponse(
      'hello',
      [],
      'be helpful',
      { channelId: 'C1', userId: 'U1', messageProvider: 'discord' },
      { name: 'BotB', MESSAGE_PROVIDER: 'discord', LLM_MAX_TOKENS: 200, LLM_TEMPERATURE: 0.5 }
    );

    expect(result).toBe('tool response');
    expect(toolSpy).toHaveBeenCalledTimes(1);
    expect(toolSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        botName: 'BotB',
        llmProvider: provider,
        userMessage: 'hello',
        historyMessages: [],
        systemPrompt: 'be helpful',
        metadata: expect.objectContaining({
          systemPrompt: 'be helpful',
          channelId: 'C1',
          userId: 'U1',
          maxTokens: 200,
          temperature: 0.5,
        }),
        toolContext: {
          userId: 'U1',
          channelId: 'C1',
          messageProvider: 'discord',
          forumId: undefined,
          forumOwnerId: undefined,
        },
      })
    );
    expect(provider.generateChatCompletion).not.toHaveBeenCalled();
  });

  it('resolves bot name from BOT_NAME when name is absent', async () => {
    const adapter = new LlmInvokerAdapter({ botConfig: {} });

    await adapter.generateResponse('hi', [], 'sys', {}, { BOT_NAME: 'NamedBot' });

    expect(toolSpy).toHaveBeenCalledWith(expect.objectContaining({ botName: 'NamedBot' }));
  });

  it('falls back to plain generateChatCompletion when toolAugmentedCompletion throws', async () => {
    toolSpy.mockRejectedValueOnce(new Error('tool setup failed'));
    const adapter = new LlmInvokerAdapter({ botConfig: {} });

    const result = await adapter.generateResponse(
      'hello',
      [],
      'be helpful',
      { foo: 'bar' },
      { name: 'BotB' }
    );

    expect(result).toBe('mock response');
    expect(provider.generateChatCompletion).toHaveBeenCalledWith('hello', [], {
      foo: 'bar',
      systemPrompt: 'be helpful',
    });
  });
});
