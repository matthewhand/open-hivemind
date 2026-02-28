import 'reflect-metadata';
import { StartupGreetingService } from '../../src/services/StartupGreetingService';
import { GreetingStateManager } from '../../src/services/GreetingStateManager';
import messageConfig from '@config/messageConfig';
import { getLlmProvider } from '@llm/getLlmProvider';
import Logger from '@common/logger';

// Mock Logger
jest.mock('@common/logger', () => {
  const mockInfo = jest.fn();
  const mockWarn = jest.fn();
  const mockError = jest.fn();
  return {
    __esModule: true,
    default: {
      withContext: jest.fn().mockReturnValue({
        info: mockInfo,
        warn: mockWarn,
        error: mockError,
      }),
      // Expose mocks directly on the default export object
      mockInfo,
      mockWarn,
      mockError,
    },
  };
});

// Mock GreetingStateManager
jest.mock('../../src/services/GreetingStateManager', () => {
  const mockInstance = {
    initialize: jest.fn(),
    hasGreetingBeenSent: jest.fn(),
    markGreetingAsSent: jest.fn(),
  };
  return {
    GreetingStateManager: {
      getInstance: jest.fn(() => mockInstance),
    },
    // Expose mock instance
    mockInstance,
  };
});

// Mock messageConfig
jest.mock('@config/messageConfig', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
  },
}));

// Mock getLlmProvider
jest.mock('@llm/getLlmProvider', () => ({
  __esModule: true,
  getLlmProvider: jest.fn(),
}));

describe('StartupGreetingService', () => {
  let service: StartupGreetingService;

  // Access mocked logger functions
  // Logger is the default export, which is our mocked object
  const { mockInfo, mockWarn, mockError } = (Logger as any);

  // Access mocked GreetingStateManager instance
  // We need to require it because it's not part of the standard export type
  const { mockInstance: mockGreetingStateManagerInstance } = require('../../src/services/GreetingStateManager');

  beforeEach(() => {
    jest.clearAllMocks();

    // We need to clear specific mocks that are not automatically cleared if they are defined outside
    mockInfo.mockClear();
    mockWarn.mockClear();
    mockError.mockClear();
    mockGreetingStateManagerInstance.initialize.mockClear();
    mockGreetingStateManagerInstance.hasGreetingBeenSent.mockClear();
    mockGreetingStateManagerInstance.markGreetingAsSent.mockClear();

    service = new StartupGreetingService(mockGreetingStateManagerInstance);
  });

  describe('initialize', () => {
    it('should initialize greeting state manager', async () => {
      await service.initialize();
      expect(mockGreetingStateManagerInstance.initialize).toHaveBeenCalled();
      expect(mockInfo).toHaveBeenCalledWith('StartupGreetingService initialized');
    });
  });

  describe('handleServiceReady', () => {
    const mockMessengerService = {
      constructor: {
        name: 'MockService',
      },
      getDefaultChannel: jest.fn(),
      sendMessageToChannel: jest.fn(),
    };

    beforeEach(() => {
      mockMessengerService.getDefaultChannel.mockReset();
      mockMessengerService.sendMessageToChannel.mockReset();
      (messageConfig.get as jest.Mock).mockReturnValue({
        disabled: false,
        message: 'Welcome!',
        use_llm: false,
      });
      mockGreetingStateManagerInstance.hasGreetingBeenSent.mockReturnValue(false);
    });

    it('should do nothing if greeting is disabled', async () => {
      (messageConfig.get as jest.Mock).mockReturnValue({ disabled: true });

      // Emit the event
      service.emit('service-ready', mockMessengerService);

      // Wait a bit since the handler is async
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockInfo).toHaveBeenCalledWith('Greeting message is disabled by configuration.');
      expect(mockMessengerService.sendMessageToChannel).not.toHaveBeenCalled();
    });

    it('should do nothing if no default channel', async () => {
      mockMessengerService.getDefaultChannel.mockReturnValue(undefined);

      service.emit('service-ready', mockMessengerService);
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockWarn).toHaveBeenCalledWith(expect.stringContaining('No default channel configured'), expect.anything());
      expect(mockMessengerService.sendMessageToChannel).not.toHaveBeenCalled();
    });

    it('should do nothing if greeting already sent', async () => {
      mockMessengerService.getDefaultChannel.mockReturnValue('general');
      mockGreetingStateManagerInstance.hasGreetingBeenSent.mockReturnValue(true);

      service.emit('service-ready', mockMessengerService);
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockInfo).toHaveBeenCalledWith('Greeting already sent for this service and channel', expect.anything());
      expect(mockMessengerService.sendMessageToChannel).not.toHaveBeenCalled();
    });

    it('should send static message when use_llm is false', async () => {
      mockMessengerService.getDefaultChannel.mockReturnValue('general');

      service.emit('service-ready', mockMessengerService);
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockMessengerService.sendMessageToChannel).toHaveBeenCalledWith('general', 'Welcome!');
      expect(mockGreetingStateManagerInstance.markGreetingAsSent).toHaveBeenCalledWith('MockService-general', 'general');
    });

    it('should use LLM when configured', async () => {
      mockMessengerService.getDefaultChannel.mockReturnValue('general');
      (messageConfig.get as jest.Mock).mockReturnValue({
        disabled: false,
        use_llm: true,
      });

      const mockProvider = {
        supportsChatCompletion: () => true,
        generateChatCompletion: jest.fn().mockResolvedValue('LLM Welcome Message'),
      };
      (getLlmProvider as jest.Mock).mockResolvedValue([mockProvider]);

      service.emit('service-ready', mockMessengerService);
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(getLlmProvider).toHaveBeenCalled();
      expect(mockProvider.generateChatCompletion).toHaveBeenCalled();
      expect(mockMessengerService.sendMessageToChannel).toHaveBeenCalledWith('general', 'LLM Welcome Message');
    });

    it('should fallback to default message if LLM fails', async () => {
      mockMessengerService.getDefaultChannel.mockReturnValue('general');
      (messageConfig.get as jest.Mock).mockReturnValue({
        disabled: false,
        use_llm: true,
        message: 'Fallback Message',
      });

      (getLlmProvider as jest.Mock).mockRejectedValue(new Error('LLM Error'));

      service.emit('service-ready', mockMessengerService);
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockError).toHaveBeenCalledWith('Failed to generate LLM greeting', expect.anything());
      expect(mockMessengerService.sendMessageToChannel).toHaveBeenCalledWith('general', 'Hello! I am online and ready to assist.');
    });

    it('should fallback to default message if LLM returns empty response', async () => {
      mockMessengerService.getDefaultChannel.mockReturnValue('general');
      (messageConfig.get as jest.Mock).mockReturnValue({
        disabled: false,
        use_llm: true,
      });

      const mockProvider = {
        supportsChatCompletion: () => true,
        generateChatCompletion: jest.fn().mockResolvedValue(''),
      };
      (getLlmProvider as jest.Mock).mockResolvedValue([mockProvider]);

      service.emit('service-ready', mockMessengerService);
      await new Promise(resolve => setTimeout(resolve, 10));

      // It should fall through to the final fallback return statement
      expect(mockMessengerService.sendMessageToChannel).toHaveBeenCalledWith('general', 'Hello! I am online and ready to assist.');
    });

    it('should strip quotes from LLM response', async () => {
      mockMessengerService.getDefaultChannel.mockReturnValue('general');
      (messageConfig.get as jest.Mock).mockReturnValue({
        disabled: false,
        use_llm: true,
      });

      const mockProvider = {
        supportsChatCompletion: () => true,
        generateChatCompletion: jest.fn().mockResolvedValue('"Quoted Message"'),
      };
      (getLlmProvider as jest.Mock).mockResolvedValue([mockProvider]);

      service.emit('service-ready', mockMessengerService);
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockMessengerService.sendMessageToChannel).toHaveBeenCalledWith('general', 'Quoted Message');
    });

    it('should fallback to default message if no LLM providers available', async () => {
      mockMessengerService.getDefaultChannel.mockReturnValue('general');
      (messageConfig.get as jest.Mock).mockReturnValue({
        disabled: false,
        use_llm: true,
      });

      (getLlmProvider as jest.Mock).mockResolvedValue([]);

      service.emit('service-ready', mockMessengerService);
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockWarn).toHaveBeenCalledWith('No LLM providers available for greeting generation');
      expect(mockMessengerService.sendMessageToChannel).toHaveBeenCalledWith('general', 'Hello! I am online and ready to assist.');
    });

    it('should use generateCompletion if chat completion is not supported', async () => {
      mockMessengerService.getDefaultChannel.mockReturnValue('general');
      (messageConfig.get as jest.Mock).mockReturnValue({
        disabled: false,
        use_llm: true,
      });

      const mockProvider = {
        supportsChatCompletion: () => false,
        supportsCompletion: () => true,
        generateCompletion: jest.fn().mockResolvedValue('Completion Welcome Message'),
      };
      (getLlmProvider as jest.Mock).mockResolvedValue([mockProvider]);

      service.emit('service-ready', mockMessengerService);
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockProvider.generateCompletion).toHaveBeenCalled();
      expect(mockMessengerService.sendMessageToChannel).toHaveBeenCalledWith('general', 'Completion Welcome Message');
    });

    it('should fallback to default message if no completion method supported', async () => {
      mockMessengerService.getDefaultChannel.mockReturnValue('general');
      (messageConfig.get as jest.Mock).mockReturnValue({
        disabled: false,
        use_llm: true,
      });

      const mockProvider = {
        supportsChatCompletion: () => false,
        supportsCompletion: () => false,
      };
      (getLlmProvider as jest.Mock).mockResolvedValue([mockProvider]);

      service.emit('service-ready', mockMessengerService);
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockMessengerService.sendMessageToChannel).toHaveBeenCalledWith('general', 'Hello! I am online and ready to assist.');
    });

    it('should handle errors in handleServiceReady', async () => {
      mockMessengerService.getDefaultChannel.mockReturnValue('general');
      mockMessengerService.sendMessageToChannel.mockRejectedValue(new Error('Send failed'));

      service.emit('service-ready', mockMessengerService);
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockError).toHaveBeenCalledWith('Failed to send greeting message', expect.anything());
    });
  });
});
