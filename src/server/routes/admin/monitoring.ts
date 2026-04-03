import Debug from 'debug';
import { Router, type Request, type Response } from 'express';
import { ErrorUtils } from '../../../common/ErrorUtils';
import { DatabaseManager } from '../../../database/DatabaseManager';
import { asyncErrorHandler } from '../../../middleware/errorHandler';
import { HTTP_STATUS } from '../../../types/constants';
import { isSafeUrl } from '../../../utils/ssrfGuard';
import { TestConnectionSchema } from '../../../validation/schemas/adminSchema';
import { validateRequest } from '../../../validation/validateRequest';
import {
  getChatModels,
  getEmbeddingModels,
  getModelsForProvider,
  getSupportedProviders,
} from '../../data/llmModels';

const debug = Debug('open-hivemind:admin:monitoring');

const router = Router();

const isTestEnv = process.env.NODE_ENV === 'test';
const rateLimit = require('express-rate-limit').default;
const configRateLimit = isTestEnv
  ? (_req: Request, _res: Response, next: any) => next()
  : rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: 'Too many configuration attempts, please try again later.',
      standardHeaders: true,
    });

// POST /providers/test-connection - Test connection to an LLM provider
router.post(
  '/providers/test-connection',
  configRateLimit,
  validateRequest(TestConnectionSchema),
  asyncErrorHandler(async (req, res) => {
    try {
      const { providerType, config } = req.body;

      debug(`Testing connection for provider type: ${providerType}`);

      // Validate provider type
      const validProviderTypes = ['openai', 'flowise', 'openwebui', 'letta'];
      if (!validProviderTypes.includes(providerType.toLowerCase())) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: 'Invalid provider type',
          message: `Provider type must be one of: ${validProviderTypes.join(', ')}`,
        });
      }

      // Dynamically load and test the provider
      const { instantiateLlmProvider, loadPlugin } = await import('../../../plugins/PluginLoader');

      let provider;
      try {
        const mod = await loadPlugin(`llm-${providerType.toLowerCase()}`);
        provider = instantiateLlmProvider(mod, config);
        debug(`Loaded provider plugin: llm-${providerType}`);
      } catch (error: unknown) {
        const hivemindError = ErrorUtils.toHivemindError(error);
        debug(`Failed to load provider plugin: ${hivemindError.message}`);
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: 'Failed to load provider',
          message: `Could not load provider plugin: ${hivemindError.message}`,
        });
      }

      // Test the connection based on provider type
      let testResult: {
        success: boolean;
        message: string;
        details?: any;
      };

      try {
        switch (providerType.toLowerCase()) {
          case 'openai': {
            // For OpenAI, we test by making a simple completion request
            if (!config.apiKey && !process.env.OPENAI_API_KEY) {
              testResult = {
                success: false,
                message: 'API key is required for OpenAI provider',
              };
              break;
            }

            try {
              // Test with a simple message
              const testResponse = await provider.generateChatCompletion('Hello', [], {
                maxTokensOverride: 5,
              });

              testResult = {
                success: true,
                message: 'Successfully connected to OpenAI',
                details: {
                  responseReceived: !!testResponse,
                  model: config.model || 'gpt-4o',
                },
              };
            } catch (error: unknown) {
              const hivemindError = ErrorUtils.toHivemindError(error);
              testResult = {
                success: false,
                message: `Connection test failed: ${hivemindError.message}`,
                details: {
                  error: hivemindError.message,
                  code: hivemindError.code,
                },
              };
            }
            break;
          }

          case 'flowise': {
            // For Flowise, we validate configuration
            if (!config.chatflowId && !config.useRest) {
              testResult = {
                success: false,
                message:
                  'Either chatflowId or useRest configuration is required for Flowise provider',
              };
              break;
            }

            if (config.baseUrl) {
              try {
                new URL(config.baseUrl);
                if (!(await isSafeUrl(config.baseUrl))) {
                  testResult = {
                    success: false,
                    message: 'Base URL is blocked for security reasons',
                  };
                  break;
                }
              } catch {
                testResult = {
                  success: false,
                  message: 'Invalid base URL format',
                };
                break;
              }
            }

            testResult = {
              success: true,
              message: 'Flowise configuration is valid',
              details: {
                useRest: config.useRest || false,
                chatflowId: config.chatflowId ? '***' : undefined,
              },
            };
            break;
          }

          case 'openwebui': {
            // For OpenWebUI, we validate URL
            if (!config.baseUrl) {
              testResult = {
                success: false,
                message: 'Base URL is required for OpenWebUI provider',
              };
              break;
            }

            try {
              new URL(config.baseUrl);
              if (!(await isSafeUrl(config.baseUrl))) {
                testResult = {
                  success: false,
                  message: 'Base URL is blocked for security reasons',
                };
                break;
              }
            } catch {
              testResult = {
                success: false,
                message: 'Invalid base URL format',
              };
              break;
            }

            testResult = {
              success: true,
              message: 'OpenWebUI configuration is valid',
              details: {
                baseUrl: config.baseUrl,
              },
            };
            break;
          }

          case 'letta': {
            // For Letta, we validate configuration
            if (!config.baseUrl && !config.agentId) {
              testResult = {
                success: false,
                message: 'Base URL and Agent ID are required for Letta provider',
              };
              break;
            }

            if (config.baseUrl) {
              try {
                new URL(config.baseUrl);
                if (!(await isSafeUrl(config.baseUrl))) {
                  testResult = {
                    success: false,
                    message: 'Base URL is blocked for security reasons',
                  };
                  break;
                }
              } catch {
                testResult = {
                  success: false,
                  message: 'Invalid base URL format',
                };
                break;
              }
            }

            testResult = {
              success: true,
              message: 'Letta configuration is valid',
              details: {
                agentId: config.agentId ? '***' : undefined,
              },
            };
            break;
          }

          default:
            testResult = {
              success: false,
              message: `Unsupported provider type: ${providerType}`,
            };
        }

        return res.json({
          success: testResult.success,
          message: testResult.message,
          data: testResult.details,
        });
      } catch (error: unknown) {
        const hivemindError = ErrorUtils.toHivemindError(error);
        debug(`Connection test error: ${hivemindError.message}`);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
          error: 'Connection test failed',
          message: hivemindError.message || 'An error occurred while testing the connection',
        });
      }
    } catch (error: unknown) {
      const hivemindError = ErrorUtils.toHivemindError(error);
      debug(`Unexpected error in test-connection endpoint: ${hivemindError.message}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: 'Failed to test connection',
        message: hivemindError.message || 'An error occurred while testing connection',
      });
    }
  })
);

// GET /providers - Get available providers
router.get('/providers', (req: Request, res: Response) => {
  try {
    const messageProviders = [
      {
        id: 'discord',
        name: 'Discord',
        description: 'Discord bot integration',
        configRequired: ['token'],
        envVarPrefix: 'DISCORD_',
      },
      {
        id: 'slack',
        name: 'Slack',
        description: 'Slack bot integration',
        configRequired: ['botToken', 'appToken'],
        envVarPrefix: 'SLACK_',
      },
      {
        id: 'telegram',
        name: 'Telegram',
        description: 'Telegram bot integration',
        configRequired: ['token'],
        envVarPrefix: 'TELEGRAM_',
      },
      {
        id: 'mattermost',
        name: 'Mattermost',
        description: 'Mattermost bot integration',
        configRequired: ['token', 'serverUrl'],
        envVarPrefix: 'MATTERMOST_',
      },
    ];

    const llmProviders = [
      {
        id: 'openai',
        name: 'OpenAI',
        description: 'OpenAI GPT models',
        configRequired: ['apiKey'],
        envVarPrefix: 'OPENAI_',
      },
      {
        id: 'flowise',
        name: 'Flowise',
        description: 'Flowise workflow engine',
        configRequired: ['baseUrl'],
        envVarPrefix: 'FLOWISE_',
      },
      {
        id: 'openwebui',
        name: 'Open WebUI',
        description: 'Open WebUI local models',
        configRequired: ['baseUrl'],
        envVarPrefix: 'OPENWEBUI_',
      },
    ];

    return res.json({
      messageProviders,
      llmProviders,
    });
  } catch (error) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: 'Failed to fetch providers',
      message: hivemindError.message || 'An error occurred while fetching providers',
    });
  }
});

// GET /system-info - Get system information
router.get('/system-info', async (req: Request, res: Response) => {
  try {
    const dbManager = DatabaseManager.getInstance();

    const systemInfo = {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      pid: process.pid,
      database: {
        connected: dbManager.isConnected(),
        stats: dbManager.isConnected() ? await dbManager.getStats() : null,
      },
      environment: process.env.NODE_ENV || 'development',
    };

    return res.json({ systemInfo });
  } catch (error) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: 'Failed to fetch system info',
      message: hivemindError.message || 'An error occurred while fetching system info',
    });
  }
});

/**
 * @openapi
 * /api/admin/llm-providers/{type}/models:
 *   get:
 *     summary: List available models for an LLM provider
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *         description: Provider type (openai, anthropic, google, perplexity)
 *       - in: query
 *         name: modelType
 *         schema:
 *           type: string
 *           enum: [chat, embedding]
 *         description: Filter by model type
 *     responses:
 *       200:
 *         description: List of available models with metadata
 */
router.get('/llm-providers/:type/models', (req: Request, res: Response) => {
  try {
    const { type } = req.params;
    const { modelType } = req.query;

    // Validate provider type
    const supportedProviders = getSupportedProviders();
    if (!supportedProviders.includes(type.toLowerCase())) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: `Unsupported provider type '${type}'. Supported providers: ${supportedProviders.join(', ')}`,
        code: 'INVALID_PROVIDER_TYPE',
      });
    }

    // Get models based on requested type
    let models;
    if (modelType === 'chat') {
      models = getChatModels(type);
    } else if (modelType === 'embedding') {
      models = getEmbeddingModels(type);
    } else {
      models = getModelsForProvider(type);
    }

    return res.json({
      success: true,
      provider: type,
      modelType: (modelType as string) || 'all',
      count: models.length,
      models,
    });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    debug('Error fetching LLM models:', hivemindError);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: 'Failed to fetch LLM models',
      message: hivemindError.message || 'An error occurred while fetching LLM models',
    });
  }
});

export default router;
