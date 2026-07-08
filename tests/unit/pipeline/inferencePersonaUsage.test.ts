/**
 * Regression tests for persona usage tracking in the InferenceStage.
 *
 * Before the fix, PersonaManager.incrementUsageCount existed but was never
 * invoked anywhere in the message flow, so every persona's usageCount stayed
 * at 0. The InferenceStage now increments the configured persona's usage count
 * each time the bot actually produces a (non-empty) LLM response.
 *
 * These tests assert:
 *   - a successful response increments the configured persona exactly once,
 *   - an empty response does NOT increment,
 *   - a missing/blank persona ID is a no-op,
 *   - failures in usage tracking never break the pipeline.
 */

import { IMessage } from '@hivemind/shared-types';
import { MessageBus } from '@src/events/MessageBus';
import { InferenceStage, type LlmInvoker } from '@src/pipeline/InferenceStage';

// --- Mock external singletons the stage touches ---------------------------

const incrementUsageCount = jest.fn().mockResolvedValue(true);

jest.mock('@src/managers/PersonaManager', () => ({
  PersonaManager: {
    getInstance: jest.fn().mockResolvedValue({
      incrementUsageCount: (...args: unknown[]) => incrementUsageCount(...args),
    }),
  },
}));

jest.mock('@src/database/DatabaseManager', () => ({
  DatabaseManager: {
    getInstance: jest.fn().mockReturnValue({
      logInference: jest.fn().mockResolvedValue(undefined),
    }),
  },
}));

jest.mock('@src/server/services/TokenBudgetService', () => ({
  TokenBudgetService: {
    getInstance: jest.fn().mockReturnValue({
      isOverBudget: jest.fn().mockReturnValue(false),
      incrementUsage: jest.fn().mockResolvedValue(undefined),
    }),
  },
}));

// ---------------------------------------------------------------------------
// Stub message
// ---------------------------------------------------------------------------

class StubMessage extends IMessage {
  constructor() {
    super({}, 'user');
    this.content = 'hello';
    this.channelId = 'ch-persona';
    this.platform = 'discord';
  }
  getMessageId(): string {
    return 'msg-1';
  }
  getText(): string {
    return this.content;
  }
  getTimestamp(): Date {
    return new Date();
  }
  setText(t: string): void {
    this.content = t;
  }
  getChannelId(): string {
    return this.channelId;
  }
  getAuthorId(): string {
    return 'user-1';
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
  mentionsUsers(): boolean {
    return false;
  }
  isFromBot(): boolean {
    return false;
  }
  getAuthorName(): string {
    return 'Tester';
  }
}

function makeContext(botConfig: Record<string, unknown>) {
  return {
    message: new StubMessage(),
    history: [],
    botConfig,
    botName: 'TestBot',
    platform: 'discord',
    channelId: 'ch-persona',
    metadata: {},
    memories: [],
    systemPrompt: 'You are a test bot.',
  };
}

describe('InferenceStage persona usage tracking', () => {
  let bus: MessageBus;

  beforeEach(() => {
    MessageBus.getInstance().reset();
    bus = MessageBus.getInstance();
    incrementUsageCount.mockClear();
    incrementUsageCount.mockResolvedValue(true);
  });

  afterEach(() => {
    bus.reset();
  });

  it('increments the configured persona usage count after a successful response', async () => {
    const llm: LlmInvoker = { generateResponse: jest.fn().mockResolvedValue('a reply') };
    const stage = new InferenceStage(bus, llm);

    await stage.process(makeContext({ persona: 'persona-123' }));

    expect(incrementUsageCount).toHaveBeenCalledTimes(1);
    expect(incrementUsageCount).toHaveBeenCalledWith('persona-123');
  });

  it('does NOT increment when the LLM returns an empty response', async () => {
    const llm: LlmInvoker = { generateResponse: jest.fn().mockResolvedValue('') };
    const stage = new InferenceStage(bus, llm);

    await stage.process(makeContext({ persona: 'persona-123' }));

    expect(incrementUsageCount).not.toHaveBeenCalled();
  });

  it('is a no-op when no persona is configured', async () => {
    const llm: LlmInvoker = { generateResponse: jest.fn().mockResolvedValue('a reply') };
    const stage = new InferenceStage(bus, llm);

    await stage.process(makeContext({}));

    expect(incrementUsageCount).not.toHaveBeenCalled();
  });

  it('is a no-op when the persona ID is blank', async () => {
    const llm: LlmInvoker = { generateResponse: jest.fn().mockResolvedValue('a reply') };
    const stage = new InferenceStage(bus, llm);

    await stage.process(makeContext({ persona: '' }));

    expect(incrementUsageCount).not.toHaveBeenCalled();
  });

  it('still emits message:response when usage tracking throws', async () => {
    incrementUsageCount.mockRejectedValueOnce(new Error('persistence failure'));
    const llm: LlmInvoker = { generateResponse: jest.fn().mockResolvedValue('a reply') };
    const stage = new InferenceStage(bus, llm);

    const responses: unknown[] = [];
    bus.on('message:response', (ctx) => {
      responses.push(ctx);
    });

    await stage.process(makeContext({ persona: 'persona-123' }));

    expect(incrementUsageCount).toHaveBeenCalledTimes(1);
    expect(responses).toHaveLength(1);
  });
});
