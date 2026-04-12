import { getGuardrailProfileByKey } from '@src/config/guardrailProfiles';
import { handleMessage } from '@src/message/handlers/messageHandler';
import { SemanticGuardrailService } from '@src/services/SemanticGuardrailService';
import type { IMessage } from '@src/types/messages';

// Mock dependencies
jest.mock('@src/config/guardrailProfiles');
jest.mock('@src/services/SemanticGuardrailService');
jest.mock('@src/llm/getLlmProvider', () => ({
  getLlmProviderForBot: jest.fn(),
}));
jest.mock('@message/management/getMessengerProvider', () => ({
  getMessengerProvider: jest.fn(),
}));
jest.mock('@src/services/toolAugmentedCompletion', () => ({
  toolAugmentedCompletion: jest.fn(),
}));
jest.mock('@src/message/helpers/processing/shouldReplyToMessage', () => ({
  shouldReplyToMessage: jest.fn(),
}));
jest.mock('@src/registries/SyncProviderRegistry', () => ({
  SyncProviderRegistry: {
    getInstance: jest.fn().mockReturnValue({
      isInitialized: jest.fn().mockReturnValue(false),
    }),
  },
}));

describe('Semantic Guardrails Integration', () => {
  let mockMessage: IMessage;
  let mockSemanticService: jest.Mocked<SemanticGuardrailService>;
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.clearAllMocks();

    process.env = { ...OLD_ENV, DISABLE_QUOTA: 'true' };

    // Mock message object
    mockMessage = {
      getText: jest.fn().mockReturnValue('Test message'),
      getAuthorId: jest.fn().mockReturnValue('user123'),
      getChannelId: jest.fn().mockReturnValue('channel456'),
      getMessageId: jest.fn().mockReturnValue('msg789'),
      isFromBot: jest.fn().mockReturnValue(false),
      role: 'user',
    } as unknown as IMessage;

    // Mock semantic guardrail service
    mockSemanticService = {
      evaluateInput: jest.fn(),
      evaluateOutput: jest.fn(),
      evaluateContent: jest.fn(),
    } as unknown as jest.Mocked<SemanticGuardrailService>;

    (SemanticGuardrailService.getInstance as jest.Mock).mockReturnValue(mockSemanticService);

    // Set up default mocks for pipeline dependencies

    const { getMessengerProvider } = require('@message/management/getMessengerProvider');

    const { getLlmProviderForBot } = require('@src/llm/getLlmProvider');

    const { toolAugmentedCompletion } = require('@src/services/toolAugmentedCompletion');

    const {
      shouldReplyToMessage,
    } = require('@src/message/helpers/processing/shouldReplyToMessage');

    getMessengerProvider.mockResolvedValue([
      {
        sendMessageToChannel: jest.fn(),
        getClientId: jest.fn().mockReturnValue('client123'),
      },
    ]);
    getLlmProviderForBot.mockResolvedValue({
      generate: jest.fn().mockResolvedValue({ text: 'Test response' }),
    });
    toolAugmentedCompletion.mockResolvedValue({ text: 'Test response' });
    shouldReplyToMessage.mockResolvedValue({ shouldReply: true, reason: 'Test' });
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  describe('Input Guardrails', () => {
    it('should block message when semantic input guardrail rejects content', async () => {
      // Mock guardrail profile with semantic input guard enabled
      const mockProfile = {
        id: 'semantic-test',
        name: 'Semantic Test Profile',
        guards: {
          semanticInputGuard: {
            enabled: true,
            prompt: 'Check for harmful content',
            llmProviderKey: 'test-provider',
          },
        },
      };

      (getGuardrailProfileByKey as jest.Mock).mockReturnValue(mockProfile);

      // Mock semantic service to reject content
      mockSemanticService.evaluateInput.mockResolvedValue({
        allowed: false,
        reason: 'Content contains harmful language',
        confidence: 0.95,
        processingTime: 150,
      });

      const botConfig = {
        name: 'TestBot',
        BOT_ID: 'bot123',
        guardrailProfile: 'semantic-test',
      };

      const result = await handleMessage(mockMessage, [], botConfig);

      expect(result).toBeNull(); // Message should be blocked
      expect(mockSemanticService.evaluateInput).toHaveBeenCalledWith(
        expect.any(String),
        mockProfile.guards.semanticInputGuard,
        expect.objectContaining({
          userId: 'user123',
          channelId: 'channel456',
          metadata: expect.objectContaining({
            botId: 'bot123',
            guardrailProfile: 'semantic-test',
          }),
        })
      );
    });

    it('should allow message when semantic input guardrail approves content', async () => {
      // Mock guardrail profile with semantic input guard enabled
      const mockProfile = {
        id: 'semantic-test',
        name: 'Semantic Test Profile',
        guards: {
          semanticInputGuard: {
            enabled: true,
            prompt: 'Check for harmful content',
            llmProviderKey: 'test-provider',
          },
        },
      };

      (getGuardrailProfileByKey as jest.Mock).mockReturnValue(mockProfile);

      // Mock semantic service to approve content
      mockSemanticService.evaluateInput.mockResolvedValue({
        allowed: true,
        reason: 'Content is safe',
        confidence: 0.98,
        processingTime: 120,
      });

      // Mock other dependencies to allow message processing to continue

      const { getMessengerProvider } = require('@message/management/getMessengerProvider');

      const { getLlmProviderForBot } = require('@src/llm/getLlmProvider');

      const mockMessageProvider = {
        sendMessageToChannel: jest.fn(),
        getClientId: jest.fn().mockReturnValue('client123'),
      };

      const mockLlmProvider = {
        generate: jest.fn().mockResolvedValue({ text: 'Test response' }),
      };

      getMessengerProvider.mockResolvedValue([mockMessageProvider]);
      getLlmProviderForBot.mockResolvedValue(mockLlmProvider);

      const botConfig = {
        name: 'TestBot',
        BOT_ID: 'bot123',
        guardrailProfile: 'semantic-test',
      };

      const result = await handleMessage(mockMessage, [], botConfig);

      expect(mockSemanticService.evaluateInput).toHaveBeenCalled();
      // Message processing should continue (not be blocked)
      expect(result).not.toBeNull();
    });
  });

  describe('Output Guardrails', () => {
    it('should block bot response when semantic output guardrail rejects content', async () => {
      // Mock guardrail profile with semantic output guard enabled
      const mockProfile = {
        id: 'semantic-test',
        name: 'Semantic Test Profile',
        guards: {
          semanticOutputGuard: {
            enabled: true,
            prompt: 'Check response for safety',
            llmProviderKey: 'test-provider',
          },
        },
      };

      (getGuardrailProfileByKey as jest.Mock).mockReturnValue(mockProfile);

      // Mock semantic service to reject output
      mockSemanticService.evaluateOutput.mockResolvedValue({
        allowed: false,
        reason: 'Response contains inappropriate content',
        confidence: 0.92,
        processingTime: 180,
      });

      // Mock other dependencies

      const { getMessengerProvider } = require('@message/management/getMessengerProvider');

      const { getLlmProviderForBot } = require('@src/llm/getLlmProvider');

      const mockMessageProvider = {
        sendMessageToChannel: jest.fn(),
        getClientId: jest.fn().mockReturnValue('client123'),
      };

      const mockLlmProvider = {
        generate: jest.fn().mockResolvedValue({ text: 'Inappropriate response' }),
      };

      getMessengerProvider.mockResolvedValue([mockMessageProvider]);
      getLlmProviderForBot.mockResolvedValue(mockLlmProvider);

      const botConfig = {
        name: 'TestBot',
        BOT_ID: 'bot123',
        guardrailProfile: 'semantic-test',
      };

      const result = await handleMessage(mockMessage, [], botConfig);

      expect(mockSemanticService.evaluateOutput).toHaveBeenCalledWith(
        expect.any(String),
        mockProfile.guards.semanticOutputGuard,
        expect.objectContaining({
          userId: 'user123',
          channelId: 'channel456',
          metadata: expect.objectContaining({
            botId: 'bot123',
            guardrailProfile: 'semantic-test',
            originalInput: expect.any(String),
          }),
        })
      );

      expect(result).toBeNull(); // Response should be blocked
      expect(mockMessageProvider.sendMessageToChannel).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should continue processing when semantic guardrail fails', async () => {
      // Mock guardrail profile with semantic input guard enabled
      const mockProfile = {
        id: 'semantic-test',
        name: 'Semantic Test Profile',
        guards: {
          semanticInputGuard: {
            enabled: true,
            prompt: 'Check for harmful content',
            llmProviderKey: 'test-provider',
          },
        },
      };

      (getGuardrailProfileByKey as jest.Mock).mockReturnValue(mockProfile);

      // Mock semantic service to throw an error
      mockSemanticService.evaluateInput.mockRejectedValue(new Error('LLM service unavailable'));

      // Mock other dependencies

      const { getMessengerProvider } = require('@message/management/getMessengerProvider');

      const { getLlmProviderForBot } = require('@src/llm/getLlmProvider');

      const mockMessageProvider = {
        sendMessageToChannel: jest.fn(),
        getClientId: jest.fn().mockReturnValue('client123'),
      };

      const mockLlmProvider = {
        generate: jest.fn().mockResolvedValue({ text: 'Test response' }),
      };

      getMessengerProvider.mockResolvedValue([mockMessageProvider]);
      getLlmProviderForBot.mockResolvedValue(mockLlmProvider);

      const botConfig = {
        name: 'TestBot',
        BOT_ID: 'bot123',
        guardrailProfile: 'semantic-test',
      };

      const result = await handleMessage(mockMessage, [], botConfig);

      // Processing should continue despite guardrail error
      expect(result).not.toBeNull();
      expect(mockSemanticService.evaluateInput).toHaveBeenCalled();
    });
  });
});
