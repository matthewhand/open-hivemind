import { getLlmProvider } from '@src/utils/llmProviderUtils';
import { getLlmProfileByKey } from '@src/config/llmProfiles';
import type { SemanticGuardrailConfig } from '@src/config/guardrailProfiles';
import { logger } from '@src/utils/logger';

export interface SemanticGuardrailResult {
  allowed: boolean;
  reason?: string;
  confidence?: number;
  processingTime?: number;
}

export interface SemanticGuardrailRequest {
  content: string;
  context?: {
    userId?: string;
    channelId?: string;
    messageType?: 'input' | 'output';
    metadata?: Record<string, unknown>;
  };
}

export class SemanticGuardrailService {
  private static instance: SemanticGuardrailService;

  public static getInstance(): SemanticGuardrailService {
    if (!SemanticGuardrailService.instance) {
      SemanticGuardrailService.instance = new SemanticGuardrailService();
    }
    return SemanticGuardrailService.instance;
  }

  /**
   * Evaluate content using semantic guardrail configuration
   */
  public async evaluateContent(
    request: SemanticGuardrailRequest,
    config: SemanticGuardrailConfig
  ): Promise<SemanticGuardrailResult> {
    const startTime = Date.now();

    try {
      // If guardrail is disabled, allow all content
      if (!config.enabled) {
        return {
          allowed: true,
          reason: 'Semantic guardrail disabled',
          processingTime: Date.now() - startTime,
        };
      }

      // Validate configuration
      if (!config.prompt) {
        logger.warn('Semantic guardrail enabled but no prompt configured');
        return {
          allowed: true,
          reason: 'No prompt configured',
          processingTime: Date.now() - startTime,
        };
      }

      // Get LLM provider
      const llmProvider = await this.getLlmProvider(config.llmProviderKey);
      if (!llmProvider) {
        logger.warn(`Semantic guardrail LLM provider not found: ${config.llmProviderKey}`);
        return {
          allowed: true,
          reason: 'LLM provider not available',
          processingTime: Date.now() - startTime,
        };
      }

      // Prepare the evaluation prompt
      const evaluationPrompt = this.buildEvaluationPrompt(config.prompt, request);

      // Call LLM with forced boolean response
      const response = await this.callLlmWithSchema(llmProvider, evaluationPrompt, config.responseSchema);

      const processingTime = Date.now() - startTime;

      // Parse response
      if (typeof response === 'boolean') {
        return {
          allowed: response,
          reason: response ? 'Content approved by semantic analysis' : 'Content blocked by semantic analysis',
          confidence: 1.0,
          processingTime,
        };
      }

      // Handle structured response
      if (typeof response === 'object' && response !== null && 'allowed' in response) {
        return {
          allowed: Boolean(response.allowed),
          reason: response.reason || (response.allowed ? 'Content approved' : 'Content blocked'),
          confidence: response.confidence || 1.0,
          processingTime,
        };
      }

      // Fallback: if we can't parse the response, allow content but log warning
      logger.warn('Semantic guardrail returned unexpected response format', { response });
      return {
        allowed: true,
        reason: 'Unable to parse guardrail response',
        processingTime,
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('Semantic guardrail evaluation failed', { error, config: config.llmProviderKey });
      
      // On error, allow content to prevent blocking legitimate requests
      return {
        allowed: true,
        reason: 'Guardrail evaluation failed',
        processingTime,
      };
    }
  }

  /**
   * Evaluate input content before processing
   */
  public async evaluateInput(
    content: string,
    config: SemanticGuardrailConfig,
    context?: SemanticGuardrailRequest['context']
  ): Promise<SemanticGuardrailResult> {
    return this.evaluateContent(
      {
        content,
        context: { ...context, messageType: 'input' },
      },
      config
    );
  }

  /**
   * Evaluate output content before sending
   */
  public async evaluateOutput(
    content: string,
    config: SemanticGuardrailConfig,
    context?: SemanticGuardrailRequest['context']
  ): Promise<SemanticGuardrailResult> {
    return this.evaluateContent(
      {
        content,
        context: { ...context, messageType: 'output' },
      },
      config
    );
  }

  /**
   * Get LLM provider instance
   */
  private async getLlmProvider(providerKey?: string) {
    if (!providerKey) {
      // Use default LLM provider if none specified
      return getLlmProvider();
    }

    const profile = getLlmProfileByKey(providerKey);
    if (!profile) {
      logger.warn(`LLM profile not found: ${providerKey}`);
      return null;
    }

    return getLlmProvider(profile);
  }

  /**
   * Build evaluation prompt with context
   */
  private buildEvaluationPrompt(basePrompt: string, request: SemanticGuardrailRequest): string {
    const contextInfo = request.context ? [
      request.context.messageType ? `Message Type: ${request.context.messageType}` : '',
      request.context.userId ? `User ID: ${request.context.userId}` : '',
      request.context.channelId ? `Channel ID: ${request.context.channelId}` : '',
    ].filter(Boolean).join('\n') : '';

    return `${basePrompt}

${contextInfo ? `Context:\n${contextInfo}\n` : ''}
Content to evaluate:
"""
${request.content}
"""

Respond with only true or false:`;
  }

  /**
   * Call LLM with schema enforcement for boolean response
   */
  private async callLlmWithSchema(
    llmProvider: any,
    prompt: string,
    responseSchema?: SemanticGuardrailConfig['responseSchema']
  ): Promise<boolean | any> {
    try {
      // Try to use structured output if provider supports it
      if (llmProvider.generateStructured && responseSchema) {
        const result = await llmProvider.generateStructured(prompt, {
          type: 'object',
          properties: {
            allowed: {
              type: 'boolean',
              description: responseSchema.description || 'Whether the content should be allowed',
            },
            reason: {
              type: 'string',
              description: 'Brief explanation of the decision',
            },
          },
          required: ['allowed'],
        });

        return result.allowed;
      }

      // Fallback to regular generation with prompt engineering
      const response = await llmProvider.generate(prompt);
      
      // Parse boolean response from text
      const text = response.toLowerCase().trim();
      if (text.includes('true') || text.includes('yes') || text.includes('allow')) {
        return true;
      }
      if (text.includes('false') || text.includes('no') || text.includes('block')) {
        return false;
      }

      // If unclear, err on the side of caution but allow content
      logger.warn('Ambiguous semantic guardrail response', { response });
      return true;

    } catch (error) {
      logger.error('LLM call failed in semantic guardrail', { error });
      throw error;
    }
  }
}

export const semanticGuardrailService = SemanticGuardrailService.getInstance();