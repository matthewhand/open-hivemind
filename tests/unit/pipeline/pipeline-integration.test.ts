/**
 * Integration tests for the full 5-stage message pipeline.
 *
 * Wires ReceiveStage -> DecisionStage -> EnrichStage -> InferenceStage -> SendStage
 * using a real MessageBus and mock dependencies, then verifies end-to-end
 * event flow for the happy path, skip path, and error path.
 */

import { MessageBus } from '@src/events/MessageBus';
import type { MessageContext } from '@src/events/types';
import {
  DecisionStage,
  EnrichStage,
  InferenceStage,
  ReceiveStage,
  SendStage,
  type DecisionStrategy,
  type LlmInvoker,
  type MemoryRetriever,
  type MemoryStorer,
  type MessageSender,
  type PromptBuilder,
} from '@src/pipeline';
import { IMessage } from '@message/interfaces/IMessage';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

class StubMessage extends IMessage {
  private id: string;
  private text: string;
  private timestamp: Date;

  constructor(text = 'hello', id = 'msg-1') {
    super({}, 'user');
    this.id = id;
    this.text = text;
    this.content = text;
    this.channelId = 'ch-1';
    this.platform = 'test';
    this.timestamp = new Date();
  }

  getMessageId(): string {
    return this.id;
  }
  getText(): string {
    return this.text;
  }
  getTimestamp(): Date {
    return this.timestamp;
  }
  setText(t: string): void {
    this.text = t;
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
    return ['user-1'];
  }
  mentionsUsers(_userId: string): boolean {
    return false;
  }
  isFromBot(): boolean {
    return false;
  }
  getAuthorName(): string {
    return 'TestUser';
  }
}

// ---------------------------------------------------------------------------
// Mock factories
// ---------------------------------------------------------------------------

function mockDecisionStrategy(shouldReply = true): DecisionStrategy {
  return {
    shouldReply: jest.fn().mockResolvedValue({
      shouldReply,
      reason: shouldReply ? 'always reply' : 'not relevant',
    }),
  };
}

function mockMemoryRetriever(memories: string[] = ['mem-1']): MemoryRetriever {
  return {
    retrieveMemories: jest.fn().mockResolvedValue(memories),
  };
}

function mockPromptBuilder(prompt = 'You are a bot.'): PromptBuilder {
  return {
    buildSystemPrompt: jest.fn().mockReturnValue(prompt),
  };
}

function mockLlmInvoker(response = 'LLM says hi'): LlmInvoker {
  return {
    generateResponse: jest.fn().mockResolvedValue(response),
  };
}

function mockSender(parts?: string[]): MessageSender {
  return {
    sendToChannel: jest
      .fn()
      .mockImplementation(async (_ch: string, text: string) => parts ?? [text]),
  };
}

function mockStorer(): MemoryStorer {
  return {
    storeMemory: jest.fn().mockResolvedValue(undefined),
  };
}

// ---------------------------------------------------------------------------
// Bootstrap helper — creates and registers all 5 stages
// ---------------------------------------------------------------------------

interface PipelineDeps {
  strategy: DecisionStrategy;
  retriever: MemoryRetriever;
  promptBuilder: PromptBuilder;
  llm: LlmInvoker;
  sender: MessageSender;
  storer: MemoryStorer;
}

function buildPipeline(bus: MessageBus, deps: PipelineDeps) {
  const receive = new ReceiveStage(bus);
  const decision = new DecisionStage(bus, deps.strategy);
  const enrich = new EnrichStage(bus, deps.retriever, deps.promptBuilder);
  const inference = new InferenceStage(bus, deps.llm);
  const send = new SendStage(bus, deps.sender, deps.storer);

  receive.register();
  decision.register();
  enrich.register();
  inference.register();
  send.register();

  return { receive, decision, enrich, inference, send };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Collect events emitted on the bus into a map of arrays. */
function collectEvents(bus: MessageBus) {
  const events: Record<string, any[]> = {};
  const track = (name: string) => (payload: any) => {
    (events[name] ??= []).push(payload);
  };
  bus.on('message:validated', track('validated'));
  bus.on('message:accepted', track('accepted'));
  bus.on('message:skipped', track('skipped'));
  bus.on('message:enriched', track('enriched'));
  bus.on('message:response', track('response'));
  bus.on('message:sent', track('sent'));
  bus.on('message:error', track('error'));
  return events;
}

/** Flush async event chain through all pipeline stages. */
async function flush(): Promise<void> {
  for (let i = 0; i < 15; i++) {
    await new Promise((r) => setTimeout(r, 10));
  }
}

async function emitIncoming(bus: MessageBus, text: string, botName = 'Bot') {
  await bus.emitAsync('message:incoming', {
    message: new StubMessage(text),
    history: [],
    botConfig: { BOT_NAME: botName },
    botName: '',
    platform: '',
    channelId: '',
    metadata: {},
  });
  await flush();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Pipeline integration', () => {
  let bus: MessageBus;

  beforeEach(() => {
    MessageBus.getInstance().reset();
    bus = MessageBus.getInstance();
  });

  // ---- Happy path: full flow from incoming to sent ----

  it('processes a message through all 5 stages to message:sent', async () => {
    const strategy = mockDecisionStrategy(true);
    const retriever = mockMemoryRetriever(['relevant memory']);
    const promptBuilder = mockPromptBuilder('Be helpful.');
    const llm = mockLlmInvoker('Hello from LLM!');
    const sender = mockSender(['Hello from LLM!']);
    const storer = mockStorer();

    buildPipeline(bus, { strategy, retriever, promptBuilder, llm, sender, storer });
    const events = collectEvents(bus);

    await emitIncoming(bus, 'hi there', 'TestBot');

    expect(events.sent?.length).toBe(1);
    expect(events.sent[0].responseText).toBe('Hello from LLM!');
    expect(events.sent[0].parts).toEqual(['Hello from LLM!']);
    expect(events.sent[0].botName).toBe('TestBot');
    expect(events.sent[0].channelId).toBe('ch-1');
  });

  // ---- Happy path: each mock called with correct args ----

  it('calls each dependency with the expected arguments', async () => {
    const strategy = mockDecisionStrategy(true);
    const retriever = mockMemoryRetriever(['mem-x']);
    const promptBuilder = mockPromptBuilder('sys prompt');
    const llm = mockLlmInvoker('answer');
    const sender = mockSender();
    const storer = mockStorer();

    buildPipeline(bus, { strategy, retriever, promptBuilder, llm, sender, storer });
    const events = collectEvents(bus);
    await emitIncoming(bus, 'question');

    expect(events.sent?.length).toBe(1);
    expect(strategy.shouldReply).toHaveBeenCalledTimes(1);
    expect(retriever.retrieveMemories).toHaveBeenCalledWith('Bot', 'question', 5);
  });

  // ---- Skip path: decision says no ----

  it('stops at message:skipped when decision strategy returns shouldReply: false', async () => {
    const strategy = mockDecisionStrategy(false);
    const llm = mockLlmInvoker('should not appear');

    buildPipeline(bus, {
      strategy,
      retriever: mockMemoryRetriever(),
      promptBuilder: mockPromptBuilder(),
      llm,
      sender: mockSender(),
      storer: mockStorer(),
    });

    const events = collectEvents(bus);
    await emitIncoming(bus, 'ignored');

    expect(events.skipped?.length).toBe(1);
    expect(events.skipped[0].reason).toBe('not relevant');
    expect(events.enriched).toBeUndefined();
    expect(events.sent).toBeUndefined();
    expect(llm.generateResponse).not.toHaveBeenCalled();
  });

  // ---- Error path: LLM throws ----

  it('emits message:error with stage="inference" when LLM throws', async () => {
    const llm: LlmInvoker = {
      generateResponse: jest.fn().mockRejectedValue(new Error('LLM down')),
    };

    buildPipeline(bus, {
      strategy: mockDecisionStrategy(true),
      retriever: mockMemoryRetriever(),
      promptBuilder: mockPromptBuilder(),
      llm,
      sender: mockSender(),
      storer: mockStorer(),
    });

    const events = collectEvents(bus);
    await emitIncoming(bus, 'fail me');

    expect(events.error?.length).toBe(1);
    expect(events.error[0].stage).toBe('inference');
    expect(events.error[0].error.message).toBe('LLM down');
    expect(events.sent).toBeUndefined();
  });

  // ---- Empty message rejected by ReceiveStage ----

  it('rejects empty messages without emitting downstream events', async () => {
    buildPipeline(bus, {
      strategy: mockDecisionStrategy(true),
      retriever: mockMemoryRetriever(),
      promptBuilder: mockPromptBuilder(),
      llm: mockLlmInvoker('nope'),
      sender: mockSender(),
      storer: mockStorer(),
    });

    const events = collectEvents(bus);
    await emitIncoming(bus, '   ');

    expect(events.validated).toBeUndefined();
    expect(events.sent).toBeUndefined();
  });

  // ---- Multiple messages processed independently ----

  it('processes two messages independently', async () => {
    const llm = mockLlmInvoker('response');

    buildPipeline(bus, {
      strategy: mockDecisionStrategy(true),
      retriever: mockMemoryRetriever(),
      promptBuilder: mockPromptBuilder(),
      llm,
      sender: mockSender(),
      storer: mockStorer(),
    });

    const events = collectEvents(bus);
    await emitIncoming(bus, 'first');
    await emitIncoming(bus, 'second');

    expect(events.sent?.length).toBe(2);
    expect(llm.generateResponse).toHaveBeenCalledTimes(2);
  });

  // ---- Memory store failure is non-fatal ----

  it('still emits message:sent even when memory storer fails', async () => {
    const storer: MemoryStorer = {
      storeMemory: jest.fn().mockRejectedValue(new Error('db down')),
    };

    buildPipeline(bus, {
      strategy: mockDecisionStrategy(true),
      retriever: mockMemoryRetriever(),
      promptBuilder: mockPromptBuilder(),
      llm: mockLlmInvoker('reply'),
      sender: mockSender(),
      storer,
    });

    const events = collectEvents(bus);
    await emitIncoming(bus, 'test');

    expect(events.sent?.length).toBe(1);
    expect(events.sent[0].responseText).toBe('reply');
  });
});
