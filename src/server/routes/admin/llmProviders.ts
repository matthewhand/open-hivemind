/* eslint-disable max-lines */
import Debug from 'debug';
import { Router, type Request, type Response } from 'express';
import { container } from 'tsyringe';
import type { IMessage } from '@hivemind/shared-types';
import { ErrorUtils } from '../../../common/ErrorUtils';
import { asyncErrorHandler } from '../../../middleware/errorHandler';
import ApiMonitorService from '../../../services/ApiMonitorService';
import { webUIStorage } from '../../../storage/webUIStorage';
import { HTTP_STATUS } from '../../../types/constants';
import { isSafeUrl } from '../../../utils/ssrfGuard';
import {
  LlmProviderSchema,
  TestConnectionSchema,
  ToggleIdParamSchema,
  ToggleProviderSchema,
  UpdateLlmProviderSchema,
} from '../../../validation/schemas/adminSchema';
import { validateRequest } from '../../../validation/validateRequest';
import { redactProvider } from '../../utils/redactProviderSecrets';

const router = Router();
const debug = Debug('app:webui:admin:llm-providers');

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

// GET /llm-providers - Get all LLM providers
router.get('/llm-providers', async (req: Request, res: Response) => {
  try {
    const providers = (await webUIStorage.getLlmProviders()).map((p: any) => redactProvider(p));
    return res.json({
      success: true,
      data: { providers },
      message: 'LLM providers retrieved successfully',
    });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: 'Failed to retrieve LLM providers',
      message: hivemindError.message || 'An error occurred while retrieving LLM providers',
    });
  }
});

/**
 * @openapi
 * /api/admin/llm-providers:
 *   post:
 *     summary: Create a new LLM provider
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               type: { type: string }
 *               config: { type: object }
 *             required: [name, type, config]
 *     responses:
 *       200:
 *         description: Created LLM provider
 */
router.post(
  '/llm-providers',
  configRateLimit,
  validateRequest(LlmProviderSchema),
  asyncErrorHandler(async (req, res) => {
    try {
      const { name, type, config } = req.body;

      // Store the raw config — webUIStorage encrypts the whole blob at rest
      // via SecureConfigManager. Do NOT pre-truncate the apiKey here: the
      // stored copy is what downstream callers (test-stream, ApiMonitor,
      // provider plugins) actually use. Redaction belongs on the response.
      const newProvider = {
        id: `llm${Date.now()}`,
        name,
        type,
        config,
        isActive: true,
      };

      // Save to persistent storage
      await webUIStorage.saveLlmProvider(newProvider);

      // Sync monitor endpoints
      container.resolve(ApiMonitorService).syncLlmEndpoints();

      return res.json({
        success: true,
        data: { provider: redactProvider(newProvider) },
        message: 'LLM provider created successfully',
      });
    } catch (error: unknown) {
      const hivemindError = ErrorUtils.toHivemindError(error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: 'Failed to create LLM provider',
        message: hivemindError.message || 'An error occurred while creating LLM provider',
      });
    }
  })
);

// PUT /llm-providers/:id - Update an existing LLM provider
router.put(
  '/llm-providers/:id',
  validateRequest(UpdateLlmProviderSchema),
  asyncErrorHandler(async (req, res) => {
    try {
      const { id } = req.params;
      const { name, type, config } = req.body;

      // Get existing provider to preserve ID and status if needed, or just overwrite
      const providers = await webUIStorage.getLlmProviders();

      const existingProvider = providers.find((p: any) => p.id === id);

      const updatedProvider = {
        id,
        name,
        type,
        config,
        isActive: existingProvider ? existingProvider.isActive : true,
      };

      // Save to persistent storage
      await webUIStorage.saveLlmProvider(updatedProvider);

      // Sync monitor endpoints
      container.resolve(ApiMonitorService).syncLlmEndpoints();

      return res.json({
        success: true,
        data: { provider: redactProvider(updatedProvider) },
        message: 'LLM provider updated successfully',
      });
    } catch (error: unknown) {
      const hivemindError = ErrorUtils.toHivemindError(error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: 'Failed to update LLM provider',
        message: hivemindError.message || 'An error occurred while updating LLM provider',
      });
    }
  })
);

/**
 * @openapi
 * /api/admin/llm-providers/{id}:
 *   delete:
 *     summary: Delete an LLM provider
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deleted LLM provider
 */
router.delete(
  '/llm-providers/:id',
  validateRequest(ToggleIdParamSchema),
  asyncErrorHandler(async (req, res) => {
    try {
      const { id } = req.params;

      // Delete from persistent storage
      await webUIStorage.deleteLlmProvider(id);

      // Sync monitor endpoints
      container.resolve(ApiMonitorService).syncLlmEndpoints();

      return res.json({
        success: true,
        message: 'LLM provider deleted successfully',
      });
    } catch (error: unknown) {
      const hivemindError = ErrorUtils.toHivemindError(error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: 'Failed to delete LLM provider',
        message: hivemindError.message || 'An error occurred while deleting LLM provider',
      });
    }
  })
);

// POST /llm-providers/:id/toggle - Toggle LLM provider active status
router.post(
  '/llm-providers/:id/toggle',
  validateRequest(ToggleProviderSchema),
  asyncErrorHandler(async (req, res) => {
    try {
      const { id } = req.params;
      const { isActive } = req.body;

      const providers = await webUIStorage.getLlmProviders();

      const provider = providers.find((p: any) => p.id === id);

      if (provider) {
        provider.isActive = isActive;
        await webUIStorage.saveLlmProvider(provider);

        // Sync monitor endpoints
        container.resolve(ApiMonitorService).syncLlmEndpoints();
      } else {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          error: 'Provider not found',
          message: `LLM provider with ID ${id} not found`,
        });
      }

      return res.json({
        success: true,
        message: 'LLM provider status updated successfully',
      });
    } catch (error: unknown) {
      const hivemindError = ErrorUtils.toHivemindError(error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: 'Failed to update provider status',
        message: hivemindError.message || 'An error occurred while updating provider status',
      });
    }
  })
);

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
                if (!(await isSafeUrl(config.baseUrl)).safe) {
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
              if (!(await isSafeUrl(config.baseUrl)).safe) {
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
                if (!(await isSafeUrl(config.baseUrl)).safe) {
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

// POST /llm-providers/providers/:type/test-stream — SSE bridge for BotTestDriveTab.
// Calls the real provider's generateChatCompletion and emits the response as a
// single SSE chunk + done event, matching the {type:'chunk'|'done'|'error'} shape
// the BotTestDriveTab consumer already parses. A true token-by-token stream is
// a follow-up — the plugin interface doesn't expose streaming yet.
// `:type` accepts either a built-in provider type (openai, flowise, ...) or an
// LLM provider *profile* key (bots created via the wizard store the profile
// key in `llmProvider`), which is resolved to its provider type + config.
router.post(
  '/llm-providers/providers/:type/test-stream',
  asyncErrorHandler(async (req, res) => {
    const rawType = String(req.params.type || '');
    let type = rawType.toLowerCase();
    const { message, systemPrompt, conversationHistory } = req.body ?? {};

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    (res as any).flushHeaders?.();

    const send = (event: object) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    if (!message || typeof message !== 'string') {
      send({ type: 'error', error: 'message field is required' });
      return res.end();
    }

    const validTypes = ['openai', 'flowise', 'openwebui', 'letta'];

    // Resolve LLM provider profile keys (e.g. a bot's linked profile) to the
    // profile's provider type and config.
    let profileConfig: Record<string, any> | null = null;
    if (!validTypes.includes(type)) {
      const { getLlmProfileByKey } = await import('../../../config/llmProfiles');
      const profile = getLlmProfileByKey(rawType);
      if (profile && validTypes.includes((profile.provider || '').toLowerCase())) {
        type = profile.provider.toLowerCase();
        profileConfig = { ...(profile.config || {}) };
      }
    }

    if (!validTypes.includes(type)) {
      send({ type: 'error', error: `Unsupported provider type: ${rawType}` });
      return res.end();
    }

    try {
      // Use the resolved profile config, or pick the first active provider
      // config of this type for model/baseUrl etc.
      const providers = await webUIStorage.getLlmProviders();
      const saved = providers.find(
        (p: any) => (p.type || '').toLowerCase() === type && p.isActive !== false
      );
      const config: Record<string, any> =
        profileConfig ?? (saved?.config ? { ...saved.config } : {});
      // Legacy data may contain a "sk-***" truncated key from before the
      // sanitization bug was fixed — drop it so the plugin falls back to env.
      if (typeof config.apiKey === 'string' && config.apiKey.endsWith('***')) {
        delete config.apiKey;
      }

      const { instantiateLlmProvider, loadPlugin } = await import('../../../plugins/PluginLoader');
      const mod = await loadPlugin(`llm-${type}`);
      const provider = instantiateLlmProvider(mod, config);

      // Adapt plain {role,content} history into the IMessage shape providers expect.
      const history = (Array.isArray(conversationHistory) ? conversationHistory : []).map(
        (m: any) => ({
          role: m.role,
          getText: () => m.content ?? '',
          metadata: {},
        })
      ) as unknown as IMessage[];

      const response = await provider.generateChatCompletion(message, history, {
        systemPrompt: systemPrompt || undefined,
      });

      send({ type: 'chunk', content: response });
      send({
        type: 'done',
        model: config.model || 'unknown',
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      });
      return res.end();
    } catch (error: unknown) {
      const hivemindError = ErrorUtils.toHivemindError(error);
      debug(`test-stream error for ${type}: ${hivemindError.message}`);
      send({ type: 'error', error: hivemindError.message || 'test-stream failed' });
      return res.end();
    }
  })
);

export default router;
