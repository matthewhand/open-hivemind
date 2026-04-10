import type { SemanticGuardrailConfig } from '@src/config/guardrailProfiles';
import { SemanticGuardrailService } from '@src/services/SemanticGuardrailService';

// Mock the dependencies
jest.mock('@src/llm/getLlmProvider');
jest.mock('@src/config/llmProfiles');
jest.mock('@common/logger', () => {
  const mockLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
  return {
    __esModule: true,
    default: {
      withContext: jest.fn().mockReturnValue(mockLogger),
    },
  };
});

describe('SemanticGuardrailService', () => {
  let service: SemanticGuardrailService;

  beforeEach(() => {
    service = SemanticGuardrailService.getInstance();
    jest.clearAllMocks();
  });

  describe('evaluateContent', () => {
    it('should allow content when guardrail is disabled', async () => {
      const config: SemanticGuardrailConfig = {
        enabled: false,
      };

      const result = await service.evaluateContent({ content: 'Hello world' }, config);

      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('Semantic guardrail disabled');
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
    });

    it('should allow content when no prompt is configured', async () => {
      const config: SemanticGuardrailConfig = {
        enabled: true,
        // No prompt configured
      };

      const result = await service.evaluateContent({ content: 'Hello world' }, config);

      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('No prompt configured');
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
    });

    it('should allow content when LLM provider is not available', async () => {
      const config: SemanticGuardrailConfig = {
        enabled: true,
        prompt: 'Test prompt',
        llmProviderKey: 'nonexistent-provider',
      };

      // Mock getLlmProvider to return null
      const { getLlmProvider } = require('@src/llm/getLlmProvider');
      getLlmProvider.mockResolvedValue([]);

      const result = await service.evaluateContent({ content: 'Hello world' }, config);

      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('LLM provider not available');
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
    });

    it('should handle LLM provider errors gracefully', async () => {
      const config: SemanticGuardrailConfig = {
        enabled: true,
        prompt: 'Test prompt',
      };

      // Mock getLlmProvider to throw an error
      const { getLlmProvider } = require('@src/llm/getLlmProvider');
      const mockProvider = {
        generateCompletion: jest.fn().mockRejectedValue(new Error('LLM error')),
      };
      getLlmProvider.mockResolvedValue([mockProvider]);

      const result = await service.evaluateContent({ content: 'Hello world' }, config);

      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('Guardrail evaluation failed');
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
    });

    it('should block content when LLM returns false', async () => {
      const config: SemanticGuardrailConfig = {
        enabled: true,
        prompt: 'Test prompt',
      };

      // Mock getLlmProvider to return a provider that blocks content
      const { getLlmProvider } = require('@src/llm/getLlmProvider');
      const mockProvider = {
        generateCompletion: jest.fn().mockResolvedValue('false'),
      };
      getLlmProvider.mockResolvedValue([mockProvider]);

      const result = await service.evaluateContent({ content: 'Harmful content' }, config);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Content blocked by semantic analysis');
      expect(result.confidence).toBe(1.0);
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
    });

    it('should allow content when LLM returns true', async () => {
      const config: SemanticGuardrailConfig = {
        enabled: true,
        prompt: 'Test prompt',
      };

      // Mock getLlmProvider to return a provider that allows content
      const { getLlmProvider } = require('@src/llm/getLlmProvider');
      const mockProvider = {
        generateCompletion: jest.fn().mockResolvedValue('true'),
      };
      getLlmProvider.mockResolvedValue([mockProvider]);

      const result = await service.evaluateContent({ content: 'Safe content' }, config);

      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('Content approved by semantic analysis');
      expect(result.confidence).toBe(1.0);
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
    });

    it('should use structured output when available', async () => {
      const config: SemanticGuardrailConfig = {
        enabled: true,
        prompt: 'Test prompt',
        responseSchema: {
          type: 'boolean',
          description: 'Test schema',
        },
      };

      // Mock getLlmProvider to return a provider with structured output support
      const { getLlmProvider } = require('@src/llm/getLlmProvider');
      const mockProvider = {
        generateCompletion: jest.fn().mockResolvedValue(JSON.stringify({ allowed: true })),
      };
      getLlmProvider.mockResolvedValue([mockProvider]);

      const result = await service.evaluateContent({ content: 'Test content' }, config);

      expect(mockProvider.generateCompletion).toHaveBeenCalled();
      expect(result.allowed).toBe(true);
    });
  });

  describe('evaluateInput', () => {
    it('should evaluate input content with correct context', async () => {
      const config: SemanticGuardrailConfig = {
        enabled: true,
        prompt: 'Test prompt',
      };

      const { getLlmProvider } = require('@src/llm/getLlmProvider');
      const mockProvider = {
        generateCompletion: jest.fn().mockResolvedValue('true'),
      };
      getLlmProvider.mockResolvedValue([mockProvider]);

      const result = await service.evaluateInput('Test input', config, {
        userId: 'user123',
        channelId: 'channel456',
      });

      expect(result.allowed).toBe(true);
      expect(mockProvider.generateCompletion).toHaveBeenCalledWith(
        expect.stringContaining('Message Type: input')
      );
    });
  });

  describe('evaluateOutput', () => {
    it('should evaluate output content with correct context', async () => {
      const config: SemanticGuardrailConfig = {
        enabled: true,
        prompt: 'Test prompt',
      };

      const { getLlmProvider } = require('@src/llm/getLlmProvider');
      const mockProvider = {
        generateCompletion: jest.fn().mockResolvedValue('true'),
      };
      getLlmProvider.mockResolvedValue([mockProvider]);

      const result = await service.evaluateOutput('Test output', config, {
        userId: 'user123',
        channelId: 'channel456',
      });

      expect(result.allowed).toBe(true);
      expect(mockProvider.generateCompletion).toHaveBeenCalledWith(
        expect.stringContaining('Message Type: output')
      );
    });
  });
});
