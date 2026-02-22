import Debug from 'debug';
import type { NextFunction, Request, Response } from 'express';
import { body, matchedData, validationResult } from 'express-validator';
import { getLlmDefaultStatus } from '../../config/llmDefaultStatus';

const debug = Debug('app:formValidation');

const ALLOWED_LLM_PROVIDERS = [
  'openai',
  'flowise',
  'openwebui',
  'perplexity',
  'replicate',
  'n8n',
  'openswarm',
];

/**
 * Validation middleware for bot configuration creation
 */
export const validateBotConfigCreation = [
  // Name validation
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Bot name is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Bot name must be between 1 and 100 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Bot name can only contain letters, numbers, underscores, and hyphens'),

  // Message provider validation
  body('messageProvider')
    .trim()
    .notEmpty()
    .withMessage('Message provider is required')
    .isIn(['discord', 'slack', 'mattermost', 'webhook'])
    .withMessage('Message provider must be one of: discord, slack, mattermost, webhook'),

  // LLM provider validation
  body('llmProvider').custom((value) => {
    const trimmed = typeof value === 'string' ? value.trim() : '';
    const llmStatus = getLlmDefaultStatus();
    if (!trimmed && !llmStatus.configured) {
      throw new Error('LLM provider is required when no default LLM provider is configured');
    }
    if (!trimmed) {
      return true;
    }
    if (!ALLOWED_LLM_PROVIDERS.includes(trimmed)) {
      throw new Error(`LLM provider must be one of: ${ALLOWED_LLM_PROVIDERS.join(', ')}`);
    }
    return true;
  }),

  // LLM profile validation
  body('llmProfile')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('LLM profile must be less than 100 characters'),

  // Persona validation
  body('persona')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Persona must be less than 100 characters'),

  // Response profile validation
  body('responseProfile')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Response profile must be less than 100 characters'),

  // MCP guard profile validation
  body('mcpGuardProfile')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('MCP guard profile must be less than 100 characters'),

  // System instruction validation
  body('systemInstruction')
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('System instruction must be less than 5000 characters'),

  // MCP servers validation
  body('mcpServers').optional().isArray().withMessage('MCP servers must be an array'),

  // MCP guard validation
  body('mcpGuard').optional().isObject().withMessage('MCP guard must be an object'),

  // Discord configuration validation
  body('discord').optional().isObject().withMessage('Discord configuration must be an object'),
  body('discord.token')
    .if(body('discord').exists())
    .notEmpty()
    .withMessage('Discord token is required when discord configuration is provided'),
  body('discord.clientId').optional().isString().withMessage('Discord client ID must be a string'),
  body('discord.guildId').optional().isString().withMessage('Discord guild ID must be a string'),
  body('discord.channelId')
    .optional()
    .isString()
    .withMessage('Discord channel ID must be a string'),
  body('discord.voiceChannelId')
    .optional()
    .isString()
    .withMessage('Discord voice channel ID must be a string'),

  // Slack configuration validation
  body('slack').optional().isObject().withMessage('Slack configuration must be an object'),
  body('slack.botToken')
    .if(body('slack').exists())
    .notEmpty()
    .withMessage('Slack bot token is required when slack configuration is provided'),
  body('slack.appToken').optional().isString().withMessage('Slack app token must be a string'),
  body('slack.signingSecret')
    .if(body('slack').exists())
    .notEmpty()
    .withMessage('Slack signing secret is required when slack configuration is provided'),
  body('slack.joinChannels')
    .optional()
    .isString()
    .withMessage('Slack join channels must be a string'),
  body('slack.defaultChannelId')
    .optional()
    .isString()
    .withMessage('Slack default channel ID must be a string'),
  body('slack.mode')
    .optional()
    .isIn(['socket', 'rtm'])
    .withMessage('Slack mode must be either socket or rtm'),

  // Mattermost configuration validation
  body('mattermost')
    .optional()
    .isObject()
    .withMessage('Mattermost configuration must be an object'),
  body('mattermost.serverUrl')
    .if(body('mattermost').exists())
    .notEmpty()
    .withMessage('Mattermost server URL is required when mattermost configuration is provided'),
  body('mattermost.token')
    .if(body('mattermost').exists())
    .notEmpty()
    .withMessage('Mattermost token is required when mattermost configuration is provided'),
  body('mattermost.channel')
    .optional()
    .isString()
    .withMessage('Mattermost channel must be a string'),

  // OpenAI configuration validation
  body('openai').optional().isObject().withMessage('OpenAI configuration must be an object'),
  body('openai.apiKey')
    .if(body('openai').exists())
    .notEmpty()
    .withMessage('OpenAI API key is required when openai configuration is provided'),
  body('openai.model').optional().isString().withMessage('OpenAI model must be a string'),
  body('openai.baseUrl').optional().isURL().withMessage('OpenAI base URL must be a valid URL'),

  // Flowise configuration validation
  body('flowise').optional().isObject().withMessage('Flowise configuration must be an object'),
  body('flowise.apiKey')
    .if(body('flowise').exists())
    .notEmpty()
    .withMessage('Flowise API key is required when flowise configuration is provided'),
  body('flowise.apiBaseUrl')
    .optional()
    .isURL()
    .withMessage('Flowise API base URL must be a valid URL'),

  // OpenWebUI configuration validation
  body('openwebui').optional().isObject().withMessage('OpenWebUI configuration must be an object'),
  body('openwebui.apiKey')
    .if(body('openwebui').exists())
    .notEmpty()
    .withMessage('OpenWebUI API key is required when openwebui configuration is provided'),
  body('openwebui.apiUrl').optional().isURL().withMessage('OpenWebUI API URL must be a valid URL'),

  // Openswarm configuration validation
  body('openswarm').optional().isObject().withMessage('Openswarm configuration must be an object'),
  body('openswarm.baseUrl')
    .optional()
    .isURL()
    .withMessage('Openswarm base URL must be a valid URL'),
  body('openswarm.apiKey').optional().isString().withMessage('Openswarm API key must be a string'),
  body('openswarm.team').optional().isString().withMessage('Openswarm team must be a string'),

  // isActive validation
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),

  // Handle validation results
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      debug('Validation errors:', errors.array());
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Invalid request data',
        details: errors.array(),
      });
    }
    return next();
  },
];

/**
 * Validation middleware for bot configuration updates
 */
export const validateBotConfigUpdate = [
  // Name validation (optional for updates)
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Bot name cannot be empty')
    .isLength({ min: 1, max: 100 })
    .withMessage('Bot name must be between 1 and 100 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Bot name can only contain letters, numbers, underscores, and hyphens'),

  // Message provider validation
  body('messageProvider')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Message provider cannot be empty')
    .isIn(['discord', 'slack', 'mattermost', 'webhook'])
    .withMessage('Message provider must be one of: discord, slack, mattermost, webhook'),

  // LLM provider validation
  body('llmProvider')
    .optional()
    .custom((value) => {
      if (typeof value !== 'string') {
        return true;
      }
      const trimmed = value.trim();
      if (!trimmed) {
        return true;
      }
      if (!ALLOWED_LLM_PROVIDERS.includes(trimmed)) {
        throw new Error(`LLM provider must be one of: ${ALLOWED_LLM_PROVIDERS.join(', ')}`);
      }
      return true;
    }),

  // LLM profile validation
  body('llmProfile')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('LLM profile must be less than 100 characters'),

  // Persona validation
  body('persona')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Persona must be less than 100 characters'),

  // Response profile validation
  body('responseProfile')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Response profile must be less than 100 characters'),

  // MCP guard profile validation
  body('mcpGuardProfile')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('MCP guard profile must be less than 100 characters'),

  // System instruction validation
  body('systemInstruction')
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('System instruction must be less than 5000 characters'),

  // MCP servers validation
  body('mcpServers').optional().isArray().withMessage('MCP servers must be an array'),

  // MCP guard validation
  body('mcpGuard').optional().isObject().withMessage('MCP guard must be an object'),

  // Discord configuration validation
  body('discord').optional().isObject().withMessage('Discord configuration must be an object'),
  body('discord.token')
    .optional()
    .if(body('discord').exists())
    .notEmpty()
    .withMessage('Discord token cannot be empty'),
  body('discord.clientId').optional().isString().withMessage('Discord client ID must be a string'),
  body('discord.guildId').optional().isString().withMessage('Discord guild ID must be a string'),
  body('discord.channelId')
    .optional()
    .isString()
    .withMessage('Discord channel ID must be a string'),
  body('discord.voiceChannelId')
    .optional()
    .isString()
    .withMessage('Discord voice channel ID must be a string'),

  // Slack configuration validation
  body('slack').optional().isObject().withMessage('Slack configuration must be an object'),
  body('slack.botToken')
    .optional()
    .if(body('slack').exists())
    .notEmpty()
    .withMessage('Slack bot token cannot be empty'),
  body('slack.appToken').optional().isString().withMessage('Slack app token must be a string'),
  body('slack.signingSecret')
    .optional()
    .if(body('slack').exists())
    .notEmpty()
    .withMessage('Slack signing secret cannot be empty'),
  body('slack.joinChannels')
    .optional()
    .isString()
    .withMessage('Slack join channels must be a string'),
  body('slack.defaultChannelId')
    .optional()
    .isString()
    .withMessage('Slack default channel ID must be a string'),
  body('slack.mode')
    .optional()
    .isIn(['socket', 'rtm'])
    .withMessage('Slack mode must be either socket or rtm'),

  // Mattermost configuration validation
  body('mattermost')
    .optional()
    .isObject()
    .withMessage('Mattermost configuration must be an object'),
  body('mattermost.serverUrl')
    .optional()
    .if(body('mattermost').exists())
    .notEmpty()
    .withMessage('Mattermost server URL cannot be empty'),
  body('mattermost.token')
    .optional()
    .if(body('mattermost').exists())
    .notEmpty()
    .withMessage('Mattermost token cannot be empty'),
  body('mattermost.channel')
    .optional()
    .isString()
    .withMessage('Mattermost channel must be a string'),

  // OpenAI configuration validation
  body('openai').optional().isObject().withMessage('OpenAI configuration must be an object'),
  body('openai.apiKey')
    .optional()
    .if(body('openai').exists())
    .notEmpty()
    .withMessage('OpenAI API key cannot be empty'),
  body('openai.model').optional().isString().withMessage('OpenAI model must be a string'),
  body('openai.baseUrl').optional().isURL().withMessage('OpenAI base URL must be a valid URL'),

  // Flowise configuration validation
  body('flowise').optional().isObject().withMessage('Flowise configuration must be an object'),
  body('flowise.apiKey')
    .optional()
    .if(body('flowise').exists())
    .notEmpty()
    .withMessage('Flowise API key cannot be empty'),
  body('flowise.apiBaseUrl')
    .optional()
    .isURL()
    .withMessage('Flowise API base URL must be a valid URL'),

  // OpenWebUI configuration validation
  body('openwebui').optional().isObject().withMessage('OpenWebUI configuration must be an object'),
  body('openwebui.apiKey')
    .optional()
    .if(body('openwebui').exists())
    .notEmpty()
    .withMessage('OpenWebUI API key cannot be empty'),
  body('openwebui.apiUrl').optional().isURL().withMessage('OpenWebUI API URL must be a valid URL'),

  // Openswarm configuration validation
  body('openswarm').optional().isObject().withMessage('Openswarm configuration must be an object'),
  body('openswarm.baseUrl')
    .optional()
    .isURL()
    .withMessage('Openswarm base URL must be a valid URL'),
  body('openswarm.apiKey').optional().isString().withMessage('Openswarm API key must be a string'),
  body('openswarm.team').optional().isString().withMessage('Openswarm team must be a string'),

  // isActive validation
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),

  // Handle validation results
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      debug('Validation errors:', errors.array());
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Invalid request data',
        details: errors.array(),
      });
    }
    return next();
  },
];

/**
 * Sanitization middleware for bot configuration
 */
export const sanitizeBotConfig = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get matched data from validation
    const data = matchedData(req, { locations: ['body'] });

    // Trim string fields
    if (typeof data.name === 'string') {
      data.name = data.name.trim();
    }
    if (typeof data.messageProvider === 'string') {
      data.messageProvider = data.messageProvider.trim();
    }
    if (typeof data.llmProvider === 'string') {
      data.llmProvider = data.llmProvider.trim();
    }
    if (typeof data.llmProfile === 'string') {
      data.llmProfile = data.llmProfile.trim();
    }
    if (typeof data.persona === 'string') {
      data.persona = data.persona.trim();
    }
    if (typeof data.responseProfile === 'string') {
      data.responseProfile = data.responseProfile.trim();
    }
    if (typeof data.mcpGuardProfile === 'string') {
      data.mcpGuardProfile = data.mcpGuardProfile.trim();
    }
    if (typeof data.systemInstruction === 'string') {
      data.systemInstruction = data.systemInstruction.trim();
    }

    // Sanitize nested objects
    if (data.discord) {
      Object.keys(data.discord).forEach((key) => {
        if (typeof data.discord[key] === 'string') {
          data.discord[key] = data.discord[key].trim();
        }
      });
    }

    if (data.slack) {
      Object.keys(data.slack).forEach((key) => {
        if (typeof data.slack[key] === 'string') {
          data.slack[key] = data.slack[key].trim();
        }
      });
    }

    if (data.mattermost) {
      Object.keys(data.mattermost).forEach((key) => {
        if (typeof data.mattermost[key] === 'string') {
          data.mattermost[key] = data.mattermost[key].trim();
        }
      });
    }

    if (data.openai) {
      Object.keys(data.openai).forEach((key) => {
        if (typeof data.openai[key] === 'string') {
          data.openai[key] = data.openai[key].trim();
        }
      });
    }

    if (data.flowise) {
      Object.keys(data.flowise).forEach((key) => {
        if (typeof data.flowise[key] === 'string') {
          data.flowise[key] = data.flowise[key].trim();
        }
      });
    }

    if (data.openwebui) {
      Object.keys(data.openwebui).forEach((key) => {
        if (typeof data.openwebui[key] === 'string') {
          data.openwebui[key] = data.openwebui[key].trim();
        }
      });
    }

    if (data.openswarm) {
      Object.keys(data.openswarm).forEach((key) => {
        if (typeof data.openswarm[key] === 'string') {
          data.openswarm[key] = data.openswarm[key].trim();
        }
      });
    }

    // Replace request body with sanitized data
    req.body = data;

    debug('Sanitized bot configuration data:', {
      name: data.name,
      messageProvider: data.messageProvider,
    });
    return next();
  } catch (error) {
    debug('Error sanitizing bot configuration:', error);
    return res.status(500).json({
      error: 'Sanitization failed',
      message: 'Failed to sanitize request data',
    });
  }
};
