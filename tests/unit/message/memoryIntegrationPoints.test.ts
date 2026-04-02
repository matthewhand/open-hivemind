/**
 * Unit tests verifying handleMessage's memory call sites (integration points).
 *
 * These are NOT integration tests -- every dependency is mocked.
 * They verify that handleMessage calls MemoryManager at the right times.
 *
 * Flow under test:
 *   user message -> memory retrieval -> prompt injection -> LLM call -> memory storage
 */

import { MemoryManager } from '@src/services/MemoryManager';
import { getLlmProviderForBot } from '@llm/getLlmProvider';
import { handleMessage } from '@message/handlers/messageHandler';
import { shouldReplyToMessage } from '@message/helpers/processing/shouldReplyToMessage';

// ---------------------------------------------------------------------------
// Module mocks — must be declared before imports are resolved
// ---------------------------------------------------------------------------

jest.mock('@llm/getLlmProvider');
jest.mock('@message/management/getMessengerProvider');
jest.mock('@message/helpers/processing/stripBotId', () => ({
  stripBotId: jest.fn((text: string) => text),
}));
jest.mock('@message/helpers/processing/addUserHint', () => ({
  addUserHintFn: jest.fn((text: string) => text),
}));
jest.mock('@message/helpers/processing/shouldReplyToMessage');
jest.mock('@config/messageConfig', () => ({
  __esModule: true,
  default: { get: jest.fn(() => undefined) },
}));

// Mock SyncProviderRegistry so the handler falls through to getLlmProviderForBot
jest.mock('@src/registries/SyncProviderRegistry', () => ({
  SyncProviderRegistry: {
    getInstance: jest.fn(() => ({
      isInitialized: jest.fn(() => false),
    })),
  },
}));

// Mock supporting singletons / services that the handler references at module level
jest.mock('@src/common/auditLogger', () => ({
  AuditLogger: {
    getInstance: jest.fn(() => ({
      logBotAction: jest.fn(),
    })),
  },
}));
jest.mock('@src/common/errors/ErrorHandler', () => ({
  ErrorHandler: { handle: jest.fn() },
}));
jest.mock('@src/common/errors/PerformanceMonitor', () => ({
  PerformanceMonitor: {
    measureAsync: jest.fn(async (fn: () => Promise<any>) => fn()),
  },
}));
jest.mock('@src/middleware/quotaMiddleware', () => ({
  getQuotaManager: jest.fn(() => ({
    checkQuota: jest.fn().mockResolvedValue({ allowed: true, used: {} }),
    consumeQuota: jest.fn().mockResolvedValue(undefined),
    consumeTokens: jest.fn().mockResolvedValue(undefined),
  })),
}));
jest.mock('@src/services/ContentFilterService', () => ({
  ContentFilterService: {
    getInstance: jest.fn(() => ({
      checkContent: jest.fn(() => ({ allowed: true })),
    })),
  },
}));
jest.mock('@src/utils/InputSanitizer', () => ({
  InputSanitizer: {
    sanitizeMessage: jest.fn((t: string) => t),
    validateMessage: jest.fn(() => ({ isValid: true })),
    stripSurroundingQuotes: jest.fn((t: string) => t),
  },
}));
jest.mock('@message/management/IdleResponseManager', () => ({
  IdleResponseManager: {
    getInstance: jest.fn(() => ({
      recordBotResponse: jest.fn(),
      recordInteraction: jest.fn(),
    })),
  },
}));
jest.mock('@message/helpers/handler/MessageDelayScheduler', () => ({
  __esModule: true,
  default: {
    getInstance: jest.fn(() => ({
      scheduleMessage: jest.fn(),
    })),
  },
}));
jest.mock('@message/helpers/processing/DuplicateMessageDetector', () => ({
  __esModule: true,
  default: {
    getInstance: jest.fn(() => ({
      isDuplicate: jest.fn(() => false),
      recordMessage: jest.fn(),
    })),
  },
}));
jest.mock('@message/helpers/processing/TokenTracker', () => ({
  __esModule: true,
  default: {
    getInstance: jest.fn(() => ({
      getResponseProbabilityModifier: jest.fn(() => 1.0),
      getDelayMultiplier: jest.fn(() => 1.0),
      getAdjustedMaxTokens: jest.fn(() => 150),
      recordTokens: jest.fn(),
      estimateTokens: jest.fn(() => 10),
    })),
  },
}));
jest.mock('@message/processing/processingLocks', () => ({
  __esModule: true,
  default: {
    isLocked: jest.fn(() => false),
    lock: jest.fn(),
    unlock: jest.fn(),
  },
}));
jest.mock('@message/helpers/processing/OutgoingMessageRateLimiter', () => ({
  __esModule: true,
  default: {
    getInstance: jest.fn(() => ({
      shouldSend: jest.fn(() => true),
      recordSend: jest.fn(),
    })),
  },
}));
jest.mock('@message/helpers/processing/TypingActivity', () => ({
  __esModule: true,
  default: {
    getInstance: jest.fn(() => ({
      start: jest.fn(),
      stop: jest.fn(),
    })),
  },
}));
jest.mock('@message/helpers/processing/AdaptiveHistoryTuner', () => ({
  __esModule: true,
  default: {
    getInstance: jest.fn(() => ({
      getLimit: jest.fn(() => 50),
      recordOutcome: jest.fn(),
    })),
  },
}));
jest.mock('@message/helpers/processing/IncomingMessageDensity', () => ({
  IncomingMessageDensity: {
    getInstance: jest.fn(() => ({
      getDensity: jest.fn(() => 0),
      recordMessage: jest.fn(),
    })),
  },
}));
jest.mock('@message/helpers/processing/ChannelActivity', () => ({
  recordBotActivity: jest.fn(),
}));
jest.mock('@message/helpers/handler/processCommand', () => ({
  processCommand: jest.fn(),
}));
jest.mock('@message/helpers/logging/LogProseSummarizer', () => ({
  summarizeLogWithLlm: jest.fn(async (text: string) => text),
}));
jest.mock('@message/PipelineMetrics', () => {
  const mockPipelineMetrics = jest.fn().mockImplementation(() => ({
    startStage: jest.fn(),
    endStage: jest.fn(),
    toJSON: jest.fn(() => ({})),
  }));
  return {
    PipelineMetrics: mockPipelineMetrics,
    pipelineEventEmitter: { emit: jest.fn(), on: jest.fn() },
  };
});
jest.mock('@message/PipelineMetricsAggregator', () => ({
  PipelineMetricsAggregator: {
    getInstance: jest.fn(() => ({
      record: jest.fn(),
    })),
  },
}));
jest.mock('@integrations/openwebui/directClient', () => ({
  generateChatCompletionDirect: jest.fn(),
}));
jest.mock('debug', () => () => jest.fn());

// Stub the tool-augmented completion so it delegates straight to the LLM.
jest.mock('@src/services/toolAugmentedCompletion', () => ({
  toolAugmentedCompletion: jest.fn(async (opts: any) => {
    const resp = await opts.llmProvider.generateChatCompletion(
      opts.userMessage,
      opts.historyMessages,
      opts.metadata
    );
    return resp;
  }),
}));

jest.mock('@message/helpers/handler/ChannelDelayManager', () => ({
  ChannelDelayManager: {
    getInstance: jest.fn(() => ({
      getKey: jest.fn((ch: string, bot: string) => `${ch}:${bot}`),
      registerMessage: jest.fn(() => ({ isLeader: true })),
      ensureMinimumDelay: jest.fn(),
      getRemainingDelayMs: jest.fn(() => 0),
      waitForDelay: jest.fn(() => Promise.resolve()),
      getReplyToMessageId: jest.fn(() => undefined),
      clear: jest.fn(),
    })),
  },
}));

// ---------------------------------------------------------------------------
// Shared mock for MemoryManager — we replace the singleton with a spy-able
// instance so each test can configure retrieval/storage behaviour.
// ---------------------------------------------------------------------------

const mockRetrieveRelevantMemories = jest.fn();
const mockStoreConversationMemory = jest.fn();
const mockFormatMemoriesForPrompt = jest.fn();

jest.mock('@src/services/MemoryManager', () => ({
  MemoryManager: {
    getInstance: jest.fn(() => ({
      retrieveRelevantMemories: mockRetrieveRelevantMemories,
      storeConversationMemory: mockStoreConversationMemory,
      formatMemoriesForPrompt: mockFormatMemoriesForPrompt,
    })),
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockGetLlmProviderForBot = getLlmProviderForBot as jest.MockedFunction<typeof getLlmProviderForBot>;
const mockGetMessengerProvider = require('@message/management/getMessengerProvider')
  .getMessengerProvider as jest.MockedFunction<any>;
const mockShouldReply = shouldReplyToMessage as jest.MockedFunction<typeof shouldReplyToMessage>;

/** Concrete IMessage implementation for testing. */
class MockMessage {
  public data: any = {};
  public role = 'user';
  public content: string;
  public platform = 'test';
  public channelId: string;
  public tool_calls?: any[];
  public metadata?: any;

  constructor(
    public text: string,
    channelId = 'test-channel',
    public authorId = 'test-user',
    public messageId = 'test-message-id',
    public isBot = false
  ) {
    this.content = text;
    this.channelId = channelId;
  }

  getText() {
    return this.text;
  }
  getChannelId() {
    return this.channelId;
  }
  getAuthorId() {
    return this.authorId;
  }
  getMessageId() {
    return this.messageId;
  }
  isFromBot() {
    return this.isBot;
  }
  getTimestamp() {
    return new Date();
  }
  setText(t: string) {
    this.text = t;
    this.content = t;
  }
  getChannelTopic() {
    return null;
  }
  getUserMentions() {
    return [];
  }
  getChannelUsers() {
    return ['user1'];
  }
  mentionsUsers() {
    return false;
  }
  getAuthorName() {
    return 'TestUser';
  }
  getGuildOrWorkspaceId() {
    return 'test-guild';
  }
  isReplyToBot() {
    return false;
  }
  isDirectMessage() {
    return false;
  }
}

/** Standard messenger mock. */
function createMockMessengerProvider() {
  return {
    sendMessageToChannel: jest.fn().mockResolvedValue('sent-ts'),
    getClientId: jest.fn().mockReturnValue('bot-id'),
    sendTypingIndicator: jest.fn().mockResolvedValue(undefined),
    resolveAgentContext: jest.fn(() => ({
      botId: 'bot-id',
      senderKey: 'bot-id',
      nameCandidates: ['TestBot'],
    })),
  };
}

/** Standard LLM mock. */
function createMockLlmProvider(responseText = 'Hello from the LLM!') {
  return {
    generateChatCompletion: jest.fn().mockResolvedValue({ text: responseText }),
    supportsHistory: jest.fn().mockReturnValue(true),
  };
}

/** Base bot config shared by all tests. */
function baseBotConfig(overrides: Record<string, unknown> = {}) {
  return {
    BOT_ID: 'bot-id',
    name: 'TestBot',
    MESSAGE_PROVIDER: 'test',
    MESSAGE_SYSTEM_PROMPT: 'You are a helpful assistant.',
    LLM_MAX_TOKENS: 150,
    LLM_TEMPERATURE: 0.7,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Setup & teardown
// ---------------------------------------------------------------------------

let mockLlm: ReturnType<typeof createMockLlmProvider>;
let mockMessenger: ReturnType<typeof createMockMessengerProvider>;

beforeEach(() => {
  jest.clearAllMocks();

  mockLlm = createMockLlmProvider();
  mockMessenger = createMockMessengerProvider();

  mockGetLlmProviderForBot.mockResolvedValue(mockLlm as any);
  mockGetMessengerProvider.mockResolvedValue([mockMessenger] as any);

  mockShouldReply.mockReturnValue({
    shouldReply: true,
    reason: 'Directly addressed',
    meta: {},
  } as any);

  // Defaults: no memories, store succeeds silently
  mockRetrieveRelevantMemories.mockResolvedValue([]);
  mockStoreConversationMemory.mockResolvedValue(undefined);
  mockFormatMemoriesForPrompt.mockReturnValue('');
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('handleMessage memory integration points', () => {
  // -----------------------------------------------------------------------
  // 1. Memory context injection
  // -----------------------------------------------------------------------
  describe('memory context injection', () => {
    it('should inject memory context into the system prompt when memories are found', async () => {
      const memories = [
        { id: 'mem-1', memory: 'User prefers dark mode', score: 0.9 },
        { id: 'mem-2', memory: 'User works at Acme Corp', score: 0.85 },
      ];
      mockRetrieveRelevantMemories.mockResolvedValue(memories);
      mockFormatMemoriesForPrompt.mockReturnValue(
        'Relevant memories from previous conversations:\n- User prefers dark mode\n- User works at Acme Corp'
      );

      const botConfig = baseBotConfig({ memoryProfile: 'test-mem0' });
      const message = new MockMessage('What theme should I use?');

      await handleMessage(message as any, [], botConfig);

      // Verify memory search was called with the user's message text
      expect(mockRetrieveRelevantMemories).toHaveBeenCalledWith(
        'TestBot',
        expect.stringContaining('What theme should I use?')
      );

      // Verify formatMemoriesForPrompt was called with the returned memories
      expect(mockFormatMemoriesForPrompt).toHaveBeenCalledWith(memories);

      // Verify the LLM received a system prompt that includes the memory block
      const toolAugmentedCompletion =
        require('@src/services/toolAugmentedCompletion').toolAugmentedCompletion;
      const callArgs = toolAugmentedCompletion.mock.calls[0][0];
      expect(callArgs.systemPrompt).toContain('Relevant memories from previous conversations');
      expect(callArgs.systemPrompt).toContain('User prefers dark mode');
    });
  });

  // -----------------------------------------------------------------------
  // 2. Memory storage after response
  // -----------------------------------------------------------------------
  describe('memory storage after response', () => {
    it('should store both user message and assistant response to memory', async () => {
      const botConfig = baseBotConfig({ memoryProfile: 'test-mem0' });
      const message = new MockMessage('Tell me a joke', 'channel-42', 'user-99');

      const response = await handleMessage(message as any, [], botConfig);

      expect(response).toBe('Hello from the LLM!');

      // Wait for fire-and-forget memory stores to flush
      await new Promise((r) => setTimeout(r, 50));

      // storeConversationMemory called twice: once for user, once for assistant
      expect(mockStoreConversationMemory).toHaveBeenCalledTimes(2);

      // User message stored
      expect(mockStoreConversationMemory).toHaveBeenCalledWith(
        'TestBot',
        expect.stringContaining('Tell me a joke'),
        'user',
        expect.objectContaining({
          channelId: 'channel-42',
          userId: 'user-99',
        })
      );

      // Assistant response stored
      expect(mockStoreConversationMemory).toHaveBeenCalledWith(
        'TestBot',
        'Hello from the LLM!',
        'assistant',
        expect.objectContaining({
          channelId: 'channel-42',
          userId: 'user-99',
        })
      );
    });
  });

  // -----------------------------------------------------------------------
  // 3. No memory profile configured
  // -----------------------------------------------------------------------
  describe('no memory profile configured', () => {
    it('should not attempt memory operations when bot has no memoryProfile', async () => {
      const botConfig = baseBotConfig(); // no memoryProfile
      const message = new MockMessage('Hello');

      const response = await handleMessage(message as any, [], botConfig);

      expect(response).toBe('Hello from the LLM!');

      // retrieveRelevantMemories is still called (MemoryManager handles the
      // "no profile" case internally by returning []), but formatMemoriesForPrompt
      // should return empty string, and the system prompt should NOT contain memory block.
      expect(mockFormatMemoriesForPrompt).toHaveBeenCalledWith([]);

      const toolAugmentedCompletion =
        require('@src/services/toolAugmentedCompletion').toolAugmentedCompletion;
      const callArgs = toolAugmentedCompletion.mock.calls[0][0];
      expect(callArgs.systemPrompt).not.toContain('Relevant memories');
    });
  });

  // -----------------------------------------------------------------------
  // 4. Memory provider failure on search — graceful handling
  // -----------------------------------------------------------------------
  describe('memory provider failure on search', () => {
    it('should still return LLM response when memory search throws', async () => {
      mockRetrieveRelevantMemories.mockRejectedValue(new Error('Mem0 API timeout'));

      const botConfig = baseBotConfig({ memoryProfile: 'test-mem0' });
      const message = new MockMessage('What is 2+2?');

      const response = await handleMessage(message as any, [], botConfig);

      // Response should still be returned — memory failure is non-fatal
      expect(response).toBe('Hello from the LLM!');

      // LLM was called (without memory context since retrieval failed)
      const toolAugmentedCompletion =
        require('@src/services/toolAugmentedCompletion').toolAugmentedCompletion;
      expect(toolAugmentedCompletion).toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // 5. Memory provider failure on store
  // -----------------------------------------------------------------------
  describe('memory provider failure on store', () => {
    it('should return response normally even when memory storage throws', async () => {
      mockStoreConversationMemory.mockRejectedValue(new Error('Storage write failed'));

      const botConfig = baseBotConfig({ memoryProfile: 'test-mem0' });
      const message = new MockMessage('Save this for later');

      const response = await handleMessage(message as any, [], botConfig);

      // Response should still be returned
      expect(response).toBe('Hello from the LLM!');

      // Verify store was attempted
      await new Promise((r) => setTimeout(r, 50));
      expect(mockStoreConversationMemory).toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // 6. Empty memory results
  // -----------------------------------------------------------------------
  describe('empty memory results', () => {
    it('should not inject memory block into prompt when search returns empty', async () => {
      mockRetrieveRelevantMemories.mockResolvedValue([]);
      mockFormatMemoriesForPrompt.mockReturnValue('');

      const botConfig = baseBotConfig({ memoryProfile: 'test-mem0' });
      const message = new MockMessage('Hello there');

      await handleMessage(message as any, [], botConfig);

      expect(mockFormatMemoriesForPrompt).toHaveBeenCalledWith([]);

      // System prompt should not contain the memory preamble
      const toolAugmentedCompletion =
        require('@src/services/toolAugmentedCompletion').toolAugmentedCompletion;
      const callArgs = toolAugmentedCompletion.mock.calls[0][0];
      expect(callArgs.systemPrompt).not.toContain('Relevant memories');
    });
  });

  // -----------------------------------------------------------------------
  // 7. Multiple memories returned
  // -----------------------------------------------------------------------
  describe('multiple memories returned', () => {
    it('should format and inject all returned memories into the prompt', async () => {
      const memories = [
        { id: 'm1', memory: 'User name is Alice', score: 0.95 },
        { id: 'm2', memory: 'Alice likes cats', score: 0.9 },
        { id: 'm3', memory: 'Alice lives in Berlin', score: 0.87 },
        { id: 'm4', memory: 'Allergic to peanuts', score: 0.8 },
        { id: 'm5', memory: 'Favourite colour is green', score: 0.75 },
      ];
      const formattedBlock = [
        'Relevant memories from previous conversations:',
        '- User name is Alice',
        '- Alice likes cats',
        '- Alice lives in Berlin',
        '- Allergic to peanuts',
        '- Favourite colour is green',
      ].join('\n');

      mockRetrieveRelevantMemories.mockResolvedValue(memories);
      mockFormatMemoriesForPrompt.mockReturnValue(formattedBlock);

      const botConfig = baseBotConfig({ memoryProfile: 'test-mem0' });
      const message = new MockMessage('Tell me about myself');

      await handleMessage(message as any, [], botConfig);

      // All 5 memories should be passed to the formatter
      expect(mockFormatMemoriesForPrompt).toHaveBeenCalledWith(memories);

      // The formatted block should appear in the system prompt
      const toolAugmentedCompletion =
        require('@src/services/toolAugmentedCompletion').toolAugmentedCompletion;
      const callArgs = toolAugmentedCompletion.mock.calls[0][0];
      expect(callArgs.systemPrompt).toContain('User name is Alice');
      expect(callArgs.systemPrompt).toContain('Alice likes cats');
      expect(callArgs.systemPrompt).toContain('Alice lives in Berlin');
      expect(callArgs.systemPrompt).toContain('Allergic to peanuts');
      expect(callArgs.systemPrompt).toContain('Favourite colour is green');
      expect(callArgs.systemPrompt).toContain('Relevant memories from previous conversations');
    });
  });
});
