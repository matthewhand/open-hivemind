import Debug from 'debug';
import { Router, type Request, type Response } from 'express';
import { ErrorUtils } from '../../../common/ErrorUtils';
import { DatabaseManager } from '../../../database/DatabaseManager';
import { HTTP_STATUS } from '../../../types/constants';
import { getRelevantEnvVars } from '../../../utils/envUtils';
import {
  getChatModels,
  getEmbeddingModels,
  getModelsForProvider,
  getSupportedProviders,
} from '../../data/llmModels';

const router = Router();
const debug = Debug('app:webui:admin:system-info');

// Get environment variable overrides
router.get('/env-overrides', (req: Request, res: Response) => {
  try {
    const envVars = getRelevantEnvVars();

    return res.json({
      success: true,
      data: { envVars },
      message: 'Environment variable overrides retrieved successfully',
    });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: 'Failed to retrieve environment variable overrides',
      message:
        hivemindError.message ||
        'An error occurred while retrieving environment variable overrides',
    });
  }
});

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
