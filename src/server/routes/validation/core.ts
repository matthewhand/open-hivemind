import Debug from 'debug';
import { Router, type Response } from 'express';
import type { AuthMiddlewareRequest } from '../../../auth/types';
import type { BotConfig } from '../../../types/config';
import { HTTP_STATUS } from '../../../types/constants';
import { ValidationTestSchema } from '../../../validation/schemas/miscSchema';
import { validateRequest } from '../../../validation/validateRequest';
import { asyncErrorHandler } from '../../../middleware/errorHandler';

const debug = Debug('app:server:routes:validation:core');

export interface BotValidationResult {
  name: string;
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ValidationSummary {
  botValidation: BotValidationResult[];
  errors: string[];
  warnings: string[];
  recommendations: string[];
  isValid: boolean;
}

export function validateBotConfiguration(bot: Partial<BotConfig>): BotValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const name = bot.name ?? 'Unnamed bot';

  if (!bot.name) {
    errors.push('Bot name is required');
    errors.push('Name is required');
  }

  if (!bot.messageProvider) {
    errors.push('Message provider is required');
  }

  if (!bot.llmProvider) {
    errors.push('LLM provider is required');
  }

  if (bot.messageProvider === 'discord') {
    if (!bot.discord?.token) {
      errors.push('Discord bot token is required');
    } else if (bot.discord.token.length < 10) {
      warnings.push('Discord token appears to be invalid (too short)');
    }
  }

  if (bot.messageProvider === 'slack') {
    if (!bot.slack?.botToken) {
      errors.push('Slack bot token is required');
    }
    if (!bot.slack?.signingSecret) {
      errors.push('Slack signing secret is required');
    }
  }

  if (bot.llmProvider === 'openai') {
    if (!bot.openai?.apiKey) {
      errors.push('OpenAI API key is required');
    } else if (!bot.openai.apiKey.startsWith('sk-')) {
      warnings.push('OpenAI API key should start with "sk-"');
    }
  }

  if ((bot.llmProvider as string) === 'anthropic') {
    if (!(bot as any).anthropic?.apiKey) {
      errors.push('Anthropic API key is required');
    } else if (!(bot as any).anthropic.apiKey.startsWith('sk-ant-')) {
      warnings.push('Anthropic API key should start with "sk-ant-"');
    }
  }

  return {
    name,
    valid: errors.length === 0 && warnings.length === 0,
    errors,
    warnings,
  };
}

export const buildRecommendations = (bots: Partial<BotConfig>[]): string[] => {
  const recommendations: string[] = [];

  if (bots.length === 1) {
    recommendations.push('Consider adding multiple message providers for redundancy');
  }

  if (bots.length > 3) {
    recommendations.push('Consider using a load balancer for better performance');
  }

  return recommendations;
};

export const evaluateBotConfigurations = (
  bots: Partial<BotConfig>[],
  environmentWarnings: string[] = []
): ValidationSummary => {
  const botValidation = bots.map(validateBotConfiguration);
  const warnings = [
    ...(environmentWarnings ?? []),
    ...botValidation.flatMap((bot) => bot.warnings),
  ];
  const errors = botValidation.flatMap((bot) => bot.errors);
  const recommendations = buildRecommendations(bots);
  const isValid = botValidation.every((bot) => bot.valid) && warnings.length === 0;

  return {
    botValidation,
    errors,
    warnings,
    recommendations,
    isValid,
  };
};

export function createCoreRoutes(): Router {
  const router = Router();

  /**
   * GET /api/validation
   * Get validation results for current configuration
   */
  router.get('/', async (req: AuthMiddlewareRequest, res: Response) => {
    try {
      // Import the BotConfigurationManager to get current configuration
      const { BotConfigurationManager } = await import('../../../config/BotConfigurationManager');

      const configManager = BotConfigurationManager.getInstance();
      const bots = configManager.getAllBots() as Partial<BotConfig>[];
      const managerWarnings = configManager.getWarnings() ?? [];

      const summary = evaluateBotConfigurations(bots, managerWarnings);

      const environmentValidation = {
        valid: managerWarnings.length === 0,
        errors: [] as string[],
        warnings: managerWarnings,
      };

      return res.json({
        isValid: summary.isValid,
        warnings: summary.warnings,
        errors: summary.errors,
        recommendations: summary.recommendations,
        botValidation: summary.botValidation,
        environmentValidation,
        timestamp: new Date().toISOString(),
      });
    } catch (error: unknown) {
      debug('ERROR:', 'Error in Configuration validation endpoint:', error);

      // Always use the standardized error message
      const errorMessage = 'Failed to validate configuration';

      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: errorMessage,
        code: 'VALIDATION_ERROR',
        isValid: false,
        warnings: [],
        errors: [errorMessage],
        recommendations: [],
        botValidation: [],
        environmentValidation: {
          valid: false,
          errors: ['Internal validation error'],
          warnings: [],
        },
        timestamp: new Date().toISOString(),
      });
    }
  });

  router.post(
    '/test',
    validateRequest(ValidationTestSchema),
    asyncErrorHandler(async (req, res) => {
      try {
        const { config } = req.body ?? {};

        if (!config) {
          return res.status(HTTP_STATUS.BAD_REQUEST).json({
            error: 'Configuration data required',
          });
        }

        if (typeof config !== 'object' || Array.isArray(config)) {
          return res.status(HTTP_STATUS.BAD_REQUEST).json({
            error: 'Configuration data must be an object',
          });
        }

        const bots = (config as { bots?: Partial<BotConfig>[] }).bots;

        if (!Array.isArray(bots)) {
          return res.status(HTTP_STATUS.OK).json({
            valid: false,
            errors: ['Configuration must include a "bots" array'],
            warnings: [],
            recommendations: [],
            botValidation: [],
            timestamp: new Date().toISOString(),
          });
        }

        const summary = evaluateBotConfigurations(bots);

        return res.json({
          valid: summary.isValid,
          errors: summary.errors,
          warnings: summary.warnings,
          recommendations: summary.recommendations,
          botValidation: summary.botValidation,
          timestamp: new Date().toISOString(),
        });
      } catch (error: any) {
        debug('Validation summary failed: %s', error.message);
        return res
          .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
          .json({ error: 'Internal server error' });
      }
    })
  );

  /**
   * WebSocket endpoint for real-time validation updates
   * This would be implemented with a WebSocket library like Socket.io
   */
  router.get('/ws', (req: AuthMiddlewareRequest, res: Response) => {
    // This is a placeholder for WebSocket implementation
    // In a real implementation, you would set up a WebSocket connection
    return res.json({
      success: false,
      message: 'WebSocket endpoint not implemented yet',
    });
  });

  return router;
}
