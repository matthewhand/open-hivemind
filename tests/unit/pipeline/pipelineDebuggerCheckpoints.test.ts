/** Pipeline debugger breakpoint coverage tests. */
import { container } from 'tsyringe';
import { IMessage } from '@hivemind/shared-types';
import { MessageBus } from '@src/events/MessageBus';
import { EnrichStage, type MemoryRetriever, type PromptBuilder } from '@src/pipeline/EnrichStage';
import { InferenceStage, type LlmInvoker } from '@src/pipeline/InferenceStage';
import { SendStage, type MessageSender } from '@src/pipeline/SendStage';
import { PipelineDebuggerService } from '@src/server/services/PipelineDebuggerService';

// --- Mock external singletons the InferenceStage touches -------------------

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

jest.mock('@src/managers/PersonaManager', () => ({
  PersonaManager: {
    getInstance: jest.fn().mockResolvedValue({
      incrementUsageCount: jest.fn().mockResolvedValue(true),
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
    this.channelId = 'ch-debug';
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

function makeContext() {
  return {
    message: new StubMessage(),
    history: [],
    botConfig: {},
    botName: 'TestBot',
    platform: 'discord',
    channelId: 'ch-debug',
    metadata: {},
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('pipeline debugger breakpoint checkpoints', () => {
  let bus: MessageBus;
  let debuggerService: PipelineDebuggerService;
  let pauseSpy: jest.SpyInstance;

  beforeEach(() => {
    MessageBus.getInstance().reset();
    bus = MessageBus.getInstance();
    debuggerService = container.resolve(PipelineDebuggerService);
    // Resolve immediately so tests never block on a manual resume.
    pauseSpy = jest
      .spyOn(debuggerService, 'pause')
      .mockImplementation(async (_stage: string, ctx: unknown) => ctx);
  });

  afterEach(() => {
    // Disarm any breakpoints toggled during the test (toggle is a flip).
    for (const stage of [...debuggerService.getPausedStages()]) {
      debuggerService.toggleBreakpoint(stage);
    }
    pauseSpy.mockRestore();
    bus.reset();
  });

  // --- EnrichStage: 'accepted' ----------------------------------------------

  it("EnrichStage pauses at the 'accepted' breakpoint when armed", async () => {
    debuggerService.toggleBreakpoint('accepted');

    const retriever: MemoryRetriever = { retrieveMemories: jest.fn().mockResolvedValue([]) };
    const builder: PromptBuilder = { buildSystemPrompt: jest.fn().mockReturnValue('sys') };
    const stage = new EnrichStage(bus, retriever, builder);

    await stage.process({ ...makeContext(), decision: { shouldReply: true, reason: 'yes' } });

    expect(pauseSpy).toHaveBeenCalledTimes(1);
    expect(pauseSpy).toHaveBeenCalledWith(
      'accepted',
      expect.objectContaining({ botName: 'TestBot' })
    );
  });

  it('EnrichStage does NOT pause when no breakpoint is armed', async () => {
    const retriever: MemoryRetriever = { retrieveMemories: jest.fn().mockResolvedValue([]) };
    const builder: PromptBuilder = { buildSystemPrompt: jest.fn().mockReturnValue('sys') };
    const stage = new EnrichStage(bus, retriever, builder);

    await stage.process({ ...makeContext(), decision: { shouldReply: true, reason: 'yes' } });

    expect(pauseSpy).not.toHaveBeenCalled();
  });

  // --- InferenceStage: 'enriched' --------------------------------------------

  it("InferenceStage pauses at the 'enriched' breakpoint when armed", async () => {
    debuggerService.toggleBreakpoint('enriched');

    const llm: LlmInvoker = { generateResponse: jest.fn().mockResolvedValue('a reply') };
    const stage = new InferenceStage(bus, llm);

    await stage.process({ ...makeContext(), memories: [], systemPrompt: 'sys' });

    expect(pauseSpy).toHaveBeenCalledTimes(1);
    expect(pauseSpy).toHaveBeenCalledWith(
      'enriched',
      expect.objectContaining({ botName: 'TestBot' })
    );
  });

  it('InferenceStage does NOT pause when no breakpoint is armed', async () => {
    const llm: LlmInvoker = { generateResponse: jest.fn().mockResolvedValue('a reply') };
    const stage = new InferenceStage(bus, llm);

    await stage.process({ ...makeContext(), memories: [], systemPrompt: 'sys' });

    expect(pauseSpy).not.toHaveBeenCalled();
  });

  // --- SendStage: 'response' --------------------------------------------------

  it("SendStage pauses at the 'response' breakpoint when armed", async () => {
    debuggerService.toggleBreakpoint('response');

    const sender: MessageSender = { sendToChannel: jest.fn().mockResolvedValue(undefined) };
    const stage = new SendStage(bus, sender);

    await stage.process({ ...makeContext(), responseText: 'a reply' });

    expect(pauseSpy).toHaveBeenCalledTimes(1);
    expect(pauseSpy).toHaveBeenCalledWith(
      'response',
      expect.objectContaining({ botName: 'TestBot' })
    );
  });

  it('SendStage does NOT pause when no breakpoint is armed', async () => {
    const sender: MessageSender = { sendToChannel: jest.fn().mockResolvedValue(undefined) };
    const stage = new SendStage(bus, sender);

    await stage.process({ ...makeContext(), responseText: 'a reply' });

    expect(pauseSpy).not.toHaveBeenCalled();
  });

  // --- Edited context from pause() is the one the stage continues with -------

  it('SendStage continues with the context returned by pause()', async () => {
    debuggerService.toggleBreakpoint('response');
    pauseSpy.mockImplementation(async (_stage: string, ctx: { responseText: string }) => ({
      ...ctx,
      responseText: 'edited at breakpoint',
    }));

    const sendToChannel = jest.fn().mockResolvedValue(undefined);
    const stage = new SendStage(bus, { sendToChannel });

    await stage.process({ ...makeContext(), responseText: 'original' });

    expect(sendToChannel).toHaveBeenCalledWith(
      'ch-debug',
      'edited at breakpoint',
      'TestBot',
      expect.objectContaining({ platform: 'discord' })
    );
  });
});
