/**
 * Full 5-stage pipeline integration test.
 *
 * Exercises REAL pipeline stages (ReceiveStage, DecisionStage, EnrichStage,
 * InferenceStage, SendStage) wired to a real MessageBus with mock adapters
 * for external dependencies. Validates end-to-end message flow including
 * happy path, skip path, error path, validation rejection, and tracing.
 */

import { MessageBus } from '@src/events/MessageBus';
import type { MessageContext, MessageEvents } from '@src/events/types';
import {
  ReceiveStage,
  DecisionStage,
  EnrichStage,
  InferenceStage,
  SendStage,
  type DecisionStrategy,
  type MemoryRetriever,
  type PromptBuilder,
  type LlmInvoker,
  type MessageSender,
  type MemoryStorer,
} from '@src/pipeline';
import { PipelineTracer } from '@src/observability/PipelineTracer';
import { IMessage } from '@message/interfaces/IMessage';

// ---------------------------------------------------------------------------
// StubMessage
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
    this.channelId = 'ch-integration';
    this.platform = 'test';
    this.timestamp = new Date();
  }

  getMessageId(): string { return this.id; }
  getText(): string { return this.text; }
  getTimestamp(): Date { return this.timestamp; }
  setText(t: string): void { this.text = t; this.content = t; }
  getChannelId(): string { return this.channelId; }
  getAuthorId(): string { return 'user-1'; }
  getChannelTopic(): string | null { return null; }
  getUserMentions(): string[] { return []; }
  getChannelUsers(): string[] { return ['user-1']; }
  mentionsUsers(_userId: string): boolean { return false; }
  isFromBot(): boolean { return false; }
  getAuthorName(): string { return 'IntegrationUser'; }
}

// ---------------------------------------------------------------------------
// Mock adapter factories
// ---------------------------------------------------------------------------

function createDecisionStrategy(shouldReply = true): DecisionStrategy {
  return {
    shouldReply: jest.fn().mockResolvedValue({
      shouldReply,
      reason: shouldReply ? 'always accept' : 'rejected by policy',
    }),
  };
}

function createMemoryRetriever(memories: string[] = ['You previously discussed testing.']): MemoryRetriever {
  return {
    retrieveMemories: jest.fn().mockResolvedValue(memories),
  };
}

function createPromptBuilder(prompt = 'You are a helpful test bot.'): PromptBuilder {
  return {
    buildSystemPrompt: jest.fn().mockReturnValue(prompt),
  };
}

function createLlmInvoker(response = 'This is the LLM response.'): LlmInvoker {
  return {
    generateResponse: jest.fn().mockResolvedValue(response),
  };
}

function createMessageSender(): MessageSender & { calls: Array<{ channelId: string; text: string; senderName?: string }> } {
  const calls: Array<{ channelId: string; text: string; senderName?: string }> = [];
  return {
    calls,
    sendToChannel: jest.fn().mockImplementation(async (channelId: string, text: string, senderName?: string) => {
      calls.push({ channelId, text, senderName });
    }),
  };
}

function createMemoryStorer(): MemoryStorer & { stored: Array<{ botName: string; text: string; role: 'user' | 'assistant'; meta?: Record<string, any> }> } {
  const stored: Array<{ botName: string; text: string; role: 'user' | 'assistant'; meta?: Record<string, any> }> = [];
  return {
    stored,
    storeMemory: jest.fn().mockImplementation(async (botName: string, text: string, role: 'user' | 'assistant', meta?: Record<string, any>) => {
      stored.push({ botName, text, role, meta });
    }),
  };
}

// ---------------------------------------------------------------------------
// Pipeline bootstrap
// ---------------------------------------------------------------------------

interface PipelineDeps {
  strategy: DecisionStrategy;
  retriever: MemoryRetriever;
  promptBuilder: PromptBuilder;
  llm: LlmInvoker;
  sender: MessageSender;
  storer: MemoryStorer;
}

function buildAndRegisterPipeline(bus: MessageBus, deps: PipelineDeps) {
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
// Event collector
// ---------------------------------------------------------------------------

type TrackedEventName = 'validated' | 'accepted' | 'skipped' | 'enriched' | 'response' | 'sent' | 'error';

function collectEvents(bus: MessageBus): Record<TrackedEventName, any[]> {
  const events: Record<string, any[]> = {};
  const track = (name: TrackedEventName) => (payload: any) => {
    (events[name] ??= []).push(payload);
  };

  bus.on('message:validated', track('validated'));
  bus.on('message:accepted', track('accepted'));
  bus.on('message:skipped', track('skipped'));
  bus.on('message:enriched', track('enriched'));
  bus.on('message:response', track('response'));
  bus.on('message:sent', track('sent'));
  bus.on('message:error', track('error'));

  return events as Record<TrackedEventName, any[]>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Allow the async event chain to fully propagate through all stages. */
async function drain(): Promise<void> {
  for (let i = 0; i < 15; i++) {
    await new Promise((r) => setTimeout(r, 10));
  }
}

async function emitIncoming(bus: MessageBus, text: string, botName = 'TestBot') {
  const msg = new StubMessage(text);
  await bus.emitAsync('message:incoming', {
    message: msg,
    history: [],
    botConfig: { BOT_NAME: botName },
    botName,
    platform: 'test',
    channelId: msg.getChannelId(),
    metadata: {},
  });
  await drain();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Full 5-stage pipeline integration', () => {
  let bus: MessageBus;

  beforeEach(() => {
    MessageBus.getInstance().reset();
    bus = MessageBus.getInstance();
  });

  afterEach(() => {
    bus.reset();
  });

  // ---- 1. Happy path ----

  describe('happy path', () => {
    it('flows through all 5 stages and delivers the response', async () => {
      const sender = createMessageSender();
      const storer = createMemoryStorer();
      const llm = createLlmInvoker('This is the LLM response.');

      buildAndRegisterPipeline(bus, {
        strategy: createDecisionStrategy(true),
        retriever: createMemoryRetriever(['You previously discussed testing.']),
        promptBuilder: createPromptBuilder('You are a helpful test bot.'),
        llm,
        sender,
        storer,
      });

      const events = collectEvents(bus);
      await emitIncoming(bus, 'Hello bot!');

      // All intermediate events fired
      expect(events.validated?.length).toBe(1);
      expect(events.accepted?.length).toBe(1);
      expect(events.enriched?.length).toBe(1);
      expect(events.response?.length).toBe(1);
      expect(events.sent?.length).toBe(1);

      // No errors or skips
      expect(events.error).toBeUndefined();
      expect(events.skipped).toBeUndefined();

      // MessageSender received the response
      expect(sender.calls.length).toBe(1);
      expect(sender.calls[0].text).toBe('This is the LLM response.');
      expect(sender.calls[0].channelId).toBe('ch-integration');
      expect(sender.calls[0].senderName).toBe('TestBot');

      // MemoryStorer received both user and assistant messages
      await drain(); // memory storage is fire-and-forget
      expect(storer.stored.length).toBe(2);

      const userEntry = storer.stored.find((s) => s.role === 'user');
      const assistantEntry = storer.stored.find((s) => s.role === 'assistant');
      expect(userEntry).toBeDefined();
      expect(userEntry!.text).toBe('Hello bot!');
      expect(userEntry!.botName).toBe('TestBot');
      expect(assistantEntry).toBeDefined();
      expect(assistantEntry!.text).toBe('This is the LLM response.');
      expect(assistantEntry!.botName).toBe('TestBot');
    });

    it('passes memories and system prompt through the enrich stage', async () => {
      const retriever = createMemoryRetriever(['memory-alpha', 'memory-beta']);
      const promptBuilder = createPromptBuilder('Custom system prompt.');
      const llm = createLlmInvoker('ok');

      buildAndRegisterPipeline(bus, {
        strategy: createDecisionStrategy(true),
        retriever,
        promptBuilder,
        llm,
        sender: createMessageSender(),
        storer: createMemoryStorer(),
      });

      const events = collectEvents(bus);
      await emitIncoming(bus, 'question');

      // Enriched event carries memories and prompt
      expect(events.enriched?.[0].memories).toEqual(['memory-alpha', 'memory-beta']);
      expect(events.enriched?.[0].systemPrompt).toBe('Custom system prompt.');

      // LLM invoker received the system prompt
      expect(llm.generateResponse).toHaveBeenCalledWith(
        'question',
        expect.any(Array),
        'Custom system prompt.',
        expect.any(Object),
      );
    });
  });

  // ---- 2. Skip path ----

  describe('skip path — decision rejects', () => {
    it('emits message:skipped and does NOT call sender or LLM', async () => {
      const strategy = createDecisionStrategy(false);
      const llm = createLlmInvoker('should never appear');
      const sender = createMessageSender();

      buildAndRegisterPipeline(bus, {
        strategy,
        retriever: createMemoryRetriever(),
        promptBuilder: createPromptBuilder(),
        llm,
        sender,
        storer: createMemoryStorer(),
      });

      const events = collectEvents(bus);
      await emitIncoming(bus, 'this message should be skipped');

      // Skipped event fires
      expect(events.skipped?.length).toBe(1);
      expect(events.skipped[0].reason).toBe('rejected by policy');

      // Validated fires (receive stage ran), but nothing downstream
      expect(events.validated?.length).toBe(1);
      expect(events.enriched).toBeUndefined();
      expect(events.response).toBeUndefined();
      expect(events.sent).toBeUndefined();

      // MessageSender NOT called
      expect(sender.sendToChannel).not.toHaveBeenCalled();
      expect(sender.calls.length).toBe(0);

      // LLM NOT called
      expect(llm.generateResponse).not.toHaveBeenCalled();
    });
  });

  // ---- 3. Error path — LLM throws ----

  describe('error path — LLM throws', () => {
    it('emits message:error with stage=inference and does NOT call sender', async () => {
      const llm: LlmInvoker = {
        generateResponse: jest.fn().mockRejectedValue(new Error('Model overloaded')),
      };
      const sender = createMessageSender();

      buildAndRegisterPipeline(bus, {
        strategy: createDecisionStrategy(true),
        retriever: createMemoryRetriever(),
        promptBuilder: createPromptBuilder(),
        llm,
        sender,
        storer: createMemoryStorer(),
      });

      const events = collectEvents(bus);
      await emitIncoming(bus, 'trigger error');

      // Error event fires with correct stage
      expect(events.error?.length).toBe(1);
      expect(events.error[0].stage).toBe('inference');
      expect(events.error[0].error).toBeInstanceOf(Error);
      expect(events.error[0].error.message).toBe('Model overloaded');

      // Pipeline progressed up to enriched, but no response or sent
      expect(events.validated?.length).toBe(1);
      expect(events.accepted?.length).toBe(1);
      expect(events.enriched?.length).toBe(1);
      expect(events.response).toBeUndefined();
      expect(events.sent).toBeUndefined();

      // MessageSender NOT called
      expect(sender.sendToChannel).not.toHaveBeenCalled();
    });
  });

  // ---- 4. Empty message — validation rejects ----

  describe('empty message — validation rejects', () => {
    it('does not emit message:validated for whitespace-only text', async () => {
      const sender = createMessageSender();
      const llm = createLlmInvoker('should not run');

      buildAndRegisterPipeline(bus, {
        strategy: createDecisionStrategy(true),
        retriever: createMemoryRetriever(),
        promptBuilder: createPromptBuilder(),
        llm,
        sender,
        storer: createMemoryStorer(),
      });

      const events = collectEvents(bus);
      await emitIncoming(bus, '   ');

      // No downstream events at all
      expect(events.validated).toBeUndefined();
      expect(events.accepted).toBeUndefined();
      expect(events.enriched).toBeUndefined();
      expect(events.response).toBeUndefined();
      expect(events.sent).toBeUndefined();
      expect(events.error).toBeUndefined();

      // Nothing called
      expect(sender.sendToChannel).not.toHaveBeenCalled();
      expect(llm.generateResponse).not.toHaveBeenCalled();
    });

    it('does not emit message:validated for empty string', async () => {
      const events = collectEvents(bus);

      buildAndRegisterPipeline(bus, {
        strategy: createDecisionStrategy(true),
        retriever: createMemoryRetriever(),
        promptBuilder: createPromptBuilder(),
        llm: createLlmInvoker(),
        sender: createMessageSender(),
        storer: createMemoryStorer(),
      });

      await emitIncoming(bus, '');

      expect(events.validated).toBeUndefined();
    });

    it('does not emit message:validated for control-characters-only text', async () => {
      const events = collectEvents(bus);

      buildAndRegisterPipeline(bus, {
        strategy: createDecisionStrategy(true),
        retriever: createMemoryRetriever(),
        promptBuilder: createPromptBuilder(),
        llm: createLlmInvoker(),
        sender: createMessageSender(),
        storer: createMemoryStorer(),
      });

      await emitIncoming(bus, '\x00\x01\x02');

      expect(events.validated).toBeUndefined();
    });
  });

  // ---- 5. PipelineTracer integration ----

  describe('PipelineTracer integration', () => {
    it('captures a completed trace with 5 child spans for the happy path', async () => {
      const tracer = new PipelineTracer(bus);
      tracer.register();

      buildAndRegisterPipeline(bus, {
        strategy: createDecisionStrategy(true),
        retriever: createMemoryRetriever(),
        promptBuilder: createPromptBuilder(),
        llm: createLlmInvoker('traced response'),
        sender: createMessageSender(),
        storer: createMemoryStorer(),
      });

      await emitIncoming(bus, 'traced message');

      const completed = tracer.getCompletedTraces();
      expect(completed.length).toBe(1);

      const trace = completed[0];
      expect(trace.rootSpan).toBeDefined();
      expect(trace.rootSpan.name).toBe('pipeline');
      expect(trace.totalDurationMs).toBeDefined();
      expect(trace.totalDurationMs).toBeGreaterThanOrEqual(0);

      // The root span should have 5 child spans: receive, decision, enrich, inference, send
      const childNames = trace.rootSpan.children.map((s) => s.name);
      expect(childNames).toEqual(['receive', 'decision', 'enrich', 'inference', 'send']);

      // Each child span should have timing data
      for (const child of trace.rootSpan.children) {
        expect(child.durationMs).toBeDefined();
        expect(child.durationMs).toBeGreaterThanOrEqual(0);
        expect(child.status).toBe('ok');
      }

      tracer.reset();
    });

    it('marks the trace as error when LLM fails', async () => {
      const tracer = new PipelineTracer(bus);
      tracer.register();

      buildAndRegisterPipeline(bus, {
        strategy: createDecisionStrategy(true),
        retriever: createMemoryRetriever(),
        promptBuilder: createPromptBuilder(),
        llm: { generateResponse: jest.fn().mockRejectedValue(new Error('boom')) },
        sender: createMessageSender(),
        storer: createMemoryStorer(),
      });

      await emitIncoming(bus, 'will fail');

      const completed = tracer.getCompletedTraces();
      expect(completed.length).toBe(1);
      expect(completed[0].rootSpan.status).toBe('error');

      tracer.reset();
    });

    it('completes the trace on skip path', async () => {
      const tracer = new PipelineTracer(bus);
      tracer.register();

      buildAndRegisterPipeline(bus, {
        strategy: createDecisionStrategy(false),
        retriever: createMemoryRetriever(),
        promptBuilder: createPromptBuilder(),
        llm: createLlmInvoker(),
        sender: createMessageSender(),
        storer: createMemoryStorer(),
      });

      await emitIncoming(bus, 'skip me');

      const completed = tracer.getCompletedTraces();
      expect(completed.length).toBe(1);
      expect(completed[0].rootSpan.status).toBe('ok');

      // Should have receive and decision spans (decision marked as skipped)
      const decisionSpan = completed[0].rootSpan.children.find((s) => s.name === 'decision');
      expect(decisionSpan).toBeDefined();
      expect(decisionSpan!.attributes.skipped).toBe(true);

      tracer.reset();
    });
  });
});
