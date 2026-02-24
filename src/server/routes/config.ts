import fs from 'fs';
import path from 'path';
import Debug from 'debug';
import { Router } from 'express';
import { testMattermostConnection } from '@hivemind/adapter-mattermost';
// testDiscordConnection import removed from @hivemind/adapter-discord; will fetch dynamically
import { testSlackConnection } from '@hivemind/adapter-slack';
import { redactSensitiveInfo } from '../../common/redactSensitiveInfo';
import { BotConfigurationManager } from '../../config/BotConfigurationManager';
import discordConfig from '../../config/discordConfig';
import flowiseConfig from '../../config/flowiseConfig';
import {
  getGuardrailProfiles,
  saveGuardrailProfiles,
  type GuardrailProfile,
} from '../../config/guardrailProfiles';
import llmConfig from '../../config/llmConfig';
import { getLlmDefaultStatus } from '../../config/llmDefaultStatus';
import { getLlmProfiles, saveLlmProfiles, type ProviderProfile } from '../../config/llmProfiles';
import mattermostConfig from '../../config/mattermostConfig';
import {
  createMcpServerProfile,
  deleteMcpServerProfile,
  getMcpServerProfiles,
  updateMcpServerProfile,
} from '../../config/mcpServerProfiles';
import messageConfig from '../../config/messageConfig';
import { getMessageDefaultStatus } from '../../config/messageDefaultStatus';
import {
  getMessageProfiles,
  saveMessageProfiles,
  type MessageProfile,
} from '../../config/messageProfiles';
import ollamaConfig from '../../config/ollamaConfig';
import openaiConfig from '../../config/openaiConfig';
import openWebUIConfig from '../../config/openWebUIConfig';
import {
  createResponseProfile,
  deleteResponseProfile,
  getResponseProfiles,
  updateResponseProfile,
  type ResponseProfile,
} from '../../config/responseProfileManager';
import slackConfig from '../../config/slackConfig';
import { UserConfigStore } from '../../config/UserConfigStore';
import webhookConfig from '../../config/webhookConfig';
import { BotManager } from '../../managers/BotManager';
import DemoModeService from '../../services/DemoModeService';
import { ErrorUtils, HivemindError } from '../../types/errors';
import {
  ConfigBackupSchema,
  ConfigRestoreSchema,
  ConfigUpdateSchema,
} from '../../validation/schemas/configSchema';
import { validateRequest } from '../../validation/validateRequest';
import { AuditedRequest, auditMiddleware, logConfigChange } from '../middleware/audit';

const debug = Debug('app:server:routes:config');
const router = Router();

// Map of base config types to their convict objects (used as schema sources)
const schemaSources: Record<string, any> = {
  message: messageConfig,
  llm: llmConfig,
  discord: discordConfig,
  slack: slackConfig,
  openai: openaiConfig,
  flowise: flowiseConfig,
  ollama: ollamaConfig,
  mattermost: mattermostConfig,
  openwebui: openWebUIConfig,
  webhook: webhookConfig,
};

// Map of all active config instances
const globalConfigs: Record<string, any> = { ...schemaSources };

// Helper to load dynamic configs from files
const loadDynamicConfigs = () => {
  try {
    const configDir = process.env.NODE_CONFIG_DIR || path.join(process.cwd(), 'config');
    const providersDir = path.join(configDir, 'providers');

    if (fs.existsSync(providersDir)) {
      const files = fs.readdirSync(providersDir);

      files.forEach((file) => {
        // Match pattern: type-name.json e.g. openai-dev.json
        const match = file.match(/^([a-z]+)-(.+)\.json$/);
        if (match) {
          const type = match[1];
          const name = match[0].replace('.json', ''); // e.g. openai-dev

          if (schemaSources[type] && !globalConfigs[name]) {
            debug(`Loading dynamic config: ${name} (type: ${type})`);
            // Create new convict instance using the base type's schema
            const convict = require('convict'); // Require local to avoid module caching issues if any
            const newConfig = convict(schemaSources[type].getSchema());

            // Load file
            newConfig.loadFile(path.join(providersDir, file));
            try {
              newConfig.validate({ allowed: 'warn' });
            } catch (e) {
              console.warn(`Validation warning for ${name}:`, e);
            }

            globalConfigs[name] = newConfig;
          }
        }
      });
    }
  } catch (e) {
    console.error('Failed to load dynamic configs:', e);
  }
};

// Initial load
loadDynamicConfigs();

// Apply audit middleware to all config routes (except in test)
if (process.env.NODE_ENV !== 'test') {
  router.use(auditMiddleware);
}

// GET /api/config/ping - Diagnostic endpoint
router.get('/ping', (req, res) => {
  return res.json({ message: 'pong', timestamp: new Date().toISOString() });
});

// Sensitive key patterns for redaction
const SENSITIVE_PATTERNS = [/token/i, /key/i, /secret/i, /password/i, /credential/i, /auth/i];

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_PATTERNS.some((pattern) => pattern.test(key));
}

function redactValue(value: unknown): string {
  if (!value) {
    return '';
  }
  const str = String(value);
  if (str.length <= 8) {
    return '••••••••';
  }
  return str.slice(0, 4) + '••••' + str.slice(-4);
}

function redactObject(obj: Record<string, unknown>, parentKey = ''): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = parentKey ? `${parentKey}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = redactObject(value as Record<string, unknown>, fullKey);
    } else if (isSensitiveKey(key) && value) {
      result[key] = {
        isRedacted: true,
        redactedValue: redactValue(value),
        hasValue: true,
      };
    } else {
      result[key] = value;
    }
  }
  return result;
}

// GET /api/config/bots - List all configured bots with redacted secrets
router.get('/bots', async (req, res) => {
  try {
    const botManager = BotManager.getInstance();
    const bots = await botManager.getAllBots();
    const manager = BotConfigurationManager.getInstance();

    // Redact sensitive values before sending to frontend
    // Map BotInstance (runtime) back to the flat structure expected by the frontend
    const safeBots = bots.map((bot: any) => {
      // Create a merged object that includes top-level props and the config object
      // This mimics the structure the frontend expects (where providers are top-level or in config)
      const mergedBot = {
        ...bot,
        ...(bot.config || {}),
      };

      const redacted = redactObject(mergedBot as Record<string, unknown>);

      return {
        ...redacted,
        id: bot.id,
        name: bot.name,
        messageProvider: bot.messageProvider,
        llmProvider: bot.llmProvider,
        isActive: bot.isActive,
        source: bot.source || (bot.config && Object.keys(bot.config).length > 0 ? 'db' : 'env'),
        // Ensure config is also present as a property for newer UI components
        config: redactObject(bot.config || {}),
        errorCount: 0, // Placeholder as BotInstance currently doesn't track error counts in this view
        messageCount: 0, // Placeholder
        connected: bot.isActive, // Simplified connected status
      };
    });

    return res.json({
      bots: safeBots,
      count: safeBots.length,
      warnings: manager.getWarnings(),
    });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    return res.status(hivemindError.statusCode || 500).json({
      error: hivemindError.message,
      code: 'CONFIG_BOTS_ERROR',
    });
  }
});

// GET /api/config/message-profiles - Get Message profile templates
router.get('/message-profiles', (req, res) => {
  try {
    return res.json({
      profiles: getMessageProfiles(),
    });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    return res.status(hivemindError.statusCode || 500).json({
      error: hivemindError.message,
      code: 'MESSAGE_PROFILE_GET_ERROR',
    });
  }
});

// POST /api/config/message-profiles - Create a Message profile
router.post('/message-profiles', (req, res) => {
  try {
    const profile = req.body as MessageProfile;
    if (!profile.key || typeof profile.key !== 'string') {
      return res.status(400).json({ error: 'profile.key is required' });
    }
    // Sanitize key to prevent path traversal and special characters
    const sanitizedKey = profile.key.replace(/[^a-zA-Z0-9-_]/g, '');
    if (sanitizedKey !== profile.key || sanitizedKey.length === 0) {
      return res.status(400).json({
        error: 'profile.key must contain only alphanumeric characters, hyphens, and underscores',
      });
    }
    if (!profile.provider || typeof profile.provider !== 'string') {
      return res.status(400).json({ error: 'profile.provider is required' });
    }

    const allProfiles = getMessageProfiles();
    if (allProfiles.message.some((p) => p.key === profile.key)) {
      return res.status(409).json({ error: `Profile with key '${profile.key}' already exists` });
    }

    const newProfile: MessageProfile = {
      key: profile.key,
      name: profile.name || profile.key,
      description: profile.description,
      provider: profile.provider,
      config: profile.config || {},
    };

    allProfiles.message.push(newProfile);
    saveMessageProfiles(allProfiles);
    return res.status(201).json({ success: true, profile: newProfile });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    return res.status(hivemindError.statusCode || 500).json({
      error: hivemindError.message,
      code: 'MESSAGE_PROFILE_POST_ERROR',
    });
  }
});

// DELETE /api/config/message-profiles/:key - Delete a Message profile
router.delete('/message-profiles/:key', (req, res) => {
  try {
    const key = req.params.key;
    const allProfiles = getMessageProfiles();
    const index = allProfiles.message.findIndex((p) => p.key === key);

    if (index === -1) {
      return res.status(404).json({ error: `Profile with key '${key}' not found` });
    }

    allProfiles.message.splice(index, 1);
    saveMessageProfiles(allProfiles);
    return res.json({ success: true, deletedKey: key });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    return res.status(hivemindError.statusCode || 500).json({
      error: hivemindError.message,
      code: 'MESSAGE_PROFILE_DELETE_ERROR',
    });
  }
});

// GET /api/config/message-status - Message default summary
router.get('/message-status', (req, res) => {
  try {
    const status = getMessageDefaultStatus();
    return res.json(status);
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    return res.status(hivemindError.statusCode || 500).json({
      error: hivemindError.message,
      code: 'MESSAGE_STATUS_GET_ERROR',
    });
  }
});

// PUT /api/config/bots/:name - Update bot configuration (with secret handling)
router.put('/bots/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const updates = req.body;

    const manager = BotConfigurationManager.getInstance();
    const existingBot = manager.getBot(name);

    if (!existingBot) {
      return res.status(404).json({ error: `Bot "${name}" not found` });
    }

    // Merge updates, but filter out redacted placeholders
    const cleanUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      // Skip if it's a redacted placeholder object
      if (value && typeof value === 'object' && (value as any).isRedacted) {
        continue; // Don't update - keep existing value
      }
      cleanUpdates[key] = value;
    }

    // Apply updates via manager
    await manager.updateBot(name, cleanUpdates);

    return res.json({ success: true, message: `Bot "${name}" updated` });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    return res.status(hivemindError.statusCode || 500).json({
      error: hivemindError.message,
      code: 'CONFIG_BOT_UPDATE_ERROR',
    });
  }
});

// GET /api/config/templates - List available templates
router.get('/templates', async (req, res) => {
  try {
    const configDir = process.env.NODE_CONFIG_DIR || path.join(process.cwd(), 'config');
    const templatesDir = path.join(configDir, 'templates');

    let files: string[] = [];
    try {
      files = (await fs.promises.readdir(templatesDir)).filter((f) => f.endsWith('.json'));
    } catch (e) {
      return res.json({ templates: [] });
    }

    const templatesPromises = files.map(async (file) => {
      try {
        const content = JSON.parse(
          await fs.promises.readFile(path.join(templatesDir, file), 'utf8')
        );
        return {
          id: file.replace('.json', ''),
          name: content.name || file.replace('.json', ''),
          description: content.description || 'No description provided',
          provider: content.provider || content.messageProvider || 'unknown',
          content,
        };
      } catch (e) {
        console.warn(`Failed to parse template ${file}:`, e);
        return null; // Skip invalid
      }
    });

    const templates = (await Promise.all(templatesPromises)).filter((t) => t !== null);

    return res.json({ templates });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    return res.status(hivemindError.statusCode || 500).json({
      error: hivemindError.message,
      code: 'CONFIG_TEMPLATES_ERROR',
    });
  }
});

// POST /api/config/templates/:id/create - Create bot from template
router.post('/templates/:id/create', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, overrides } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Bot name is required' });
    }

    const configDir = process.env.NODE_CONFIG_DIR || path.join(process.cwd(), 'config');
    const templatePath = path.join(configDir, 'templates', `${id}.json`);

    let template;
    try {
      const data = await fs.promises.readFile(templatePath, 'utf8');
      template = JSON.parse(data);
    } catch (e) {
      return res.status(404).json({ error: 'Template not found or invalid' });
    }

    // Create new bot config based on template
    const newBotConfig = {
      ...template,
      name, // User provided name
      ...overrides, // Optional overrides provided by UI
    };

    // Use BotConfigurationManager to Add new bot
    const manager = BotConfigurationManager.getInstance();
    await manager.addBot(newBotConfig);

    return res.json({ success: true, message: `Bot "${name}" created from template "${id}"` });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    return res.status(hivemindError.statusCode || 500).json({
      error: hivemindError.message,
      code: 'CONFIG_TEMPLATE_CREATE_ERROR',
    });
  }
});

// GET /api/config/global - Get all global configurations (schema + values)
router.get('/global', (req, res) => {
  try {
    const response: Record<string, any> = {};

    Object.entries(globalConfigs).forEach(([key, config]) => {
      // Get properties (values)
      const props = config.getProperties();

      // Get schema and deep clone it to avoid mutating the source
      const schema = JSON.parse(JSON.stringify(config.getSchema()));

      // Check for environment variable overrides and mark as locked
      // Handle both nested 'properties' (valid JSON schema) and flat (convict internal) structure
      const properties = schema.properties || schema;

      for (const propKey in properties) {
        const prop = properties[propKey];
        // Ensure it's an object description
        if (typeof prop === 'object' && prop !== null) {
          // Check if ENV var is actually set in process.env
          // Note: convict schema 'env' property tells us WHICH env var map to.
          if (prop.env && process.env[prop.env] !== undefined && process.env[prop.env] !== '') {
            prop.locked = true;
          }
        }
      }

      // Redact sensitive values in props
      const redactedProps = JSON.parse(JSON.stringify(props)); // Deep copy

      // Helper to redact recursively
      const redactObject = (obj: any) => {
        for (const k in obj) {
          if (typeof obj[k] === 'object' && obj[k] !== null) {
            redactObject(obj[k]);
          } else if (typeof k === 'string') {
            if (
              k.toLowerCase().includes('token') ||
              k.toLowerCase().includes('key') ||
              k.toLowerCase().includes('secret') ||
              k.toLowerCase().includes('password')
            ) {
              obj[k] = '********';
            }
          }
        }
      };
      redactObject(redactedProps);

      response[key] = {
        values: redactedProps,
        schema: schema,
      };
    });

    // Include user's saved general settings from user-config.json
    const userConfigStore = UserConfigStore.getInstance();
    const generalSettings = userConfigStore.getGeneralSettings();
    if (Object.keys(generalSettings).length > 0) {
      response._userSettings = {
        values: generalSettings,
        schema: null, // No schema for user settings
        source: 'user-config.json',
      };
    }

    return res.json(response);
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    return res.status(hivemindError.statusCode || 500).json({
      error: hivemindError.message,
      code: hivemindError.code || 'CONFIG_GLOBAL_GET_ERROR',
    });
  }
});

// PUT /api/config/global - Update global configuration
router.put('/global', validateRequest(ConfigUpdateSchema), async (req, res) => {
  try {
    const { configName, updates, ...directUpdates } = req.body;

    // Sanitize configName to prevent path traversal
    if (
      configName &&
      (configName.includes('..') || configName.includes('/') || configName.includes('\\'))
    ) {
      return res.status(400).json({ error: 'Invalid config name: path traversal detected' });
    }

    // If no configName provided, store settings in user-config.json via UserConfigStore
    if (!configName) {
      const userConfigStore = UserConfigStore.getInstance();
      // Determine what to save - either 'updates' object or direct fields
      const settingsToSave = updates || directUpdates;

      // Save general settings to user config
      await userConfigStore.setGeneralSettings(settingsToSave);

      if (process.env.NODE_ENV !== 'test') {
        logConfigChange(
          req as any,
          'UPDATE',
          'config/general',
          'success',
          'Updated general settings'
        );
      }

      return res.json({ success: true, message: 'General settings updated and persisted' });
    }

    let config = globalConfigs[configName];
    let createdNew = false;

    // Handle creation of new dynamic config if it doesn't exist but matches pattern
    if (!config) {
      // Validate config name strictly to allow only alphanumeric characters, hyphens, and underscores
      const match = configName.match(/^([a-z]+)-[a-zA-Z0-9-_]+$/);
      if (match && schemaSources[match[1]]) {
        const type = match[1];
        debug(`Creating new dynamic config: ${configName} (type: ${type})`);
        const convict = require('convict');
        config = convict(schemaSources[type].getSchema());
        globalConfigs[configName] = config;
        createdNew = true;
      } else {
        return res.status(400).json({
          error: `Invalid configName '${configName}'. Must be existing or match 'type-name' pattern (e.g. openai-test). Valid types: ${Object.keys(schemaSources).join(', ')}`,
        });
      }
    }

    const configDir = process.env.NODE_CONFIG_DIR || path.join(process.cwd(), 'config');

    // Determine target file
    let targetFile = '';
    // If it's one of the base sources, use its standard file, else use dynamic name
    if (schemaSources[configName] && !createdNew) {
      switch (configName) {
        case 'message':
          targetFile = 'providers/message.json';
          break;
        case 'llm':
          targetFile = 'providers/llm.json';
          break;
        case 'discord':
          targetFile = 'providers/discord.json';
          break;
        case 'slack':
          targetFile = 'providers/slack.json';
          break;
        case 'openai':
          targetFile = 'providers/openai.json';
          break;
        case 'flowise':
          targetFile = 'providers/flowise.json';
          break;
        case 'mattermost':
          targetFile = 'providers/mattermost.json';
          break;
        case 'openwebui':
          targetFile = 'providers/openwebui.json';
          break;
        case 'webhook':
          targetFile = 'providers/webhook.json';
          break;
        default:
          targetFile = `providers/${configName}.json`;
      }
    } else {
      // Dynamic named config
      targetFile = `providers/${configName}.json`;
    }

    const targetPath = path.join(configDir, targetFile);

    // Read existing file if not creating new
    let fileContent: any = {};
    try {
      const data = await fs.promises.readFile(targetPath, 'utf8');
      fileContent = JSON.parse(data);
    } catch (e) {
      // ignore - file might not exist or be invalid JSON
    }

    // Merge updates
    const newContent = { ...fileContent, ...updates };

    // Write back
    const targetDir = path.dirname(targetPath);
    await fs.promises.mkdir(targetDir, { recursive: true });

    await fs.promises.writeFile(targetPath, JSON.stringify(newContent, null, 2));

    // Reload config in memory
    config.load(newContent);
    config.validate({ allowed: 'warn' });

    // Log audit
    if (process.env.NODE_ENV !== 'test') {
      logConfigChange(
        req as any,
        'UPDATE',
        `config/${configName}`,
        'success',
        `Updated configuration for ${configName}`
      );
    }

    return res.json({ success: true, message: 'Configuration updated and persisted' });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    return res.status(hivemindError.statusCode || 500).json({
      error: hivemindError.message,
      code: hivemindError.code || 'CONFIG_GLOBAL_PUT_ERROR',
    });
  }
});

// Get all configuration with sensitive data redacted
router.get('/', async (req, res) => {
  try {
    // Check for demo mode first
    const demoService = DemoModeService.getInstance();

    if (demoService.isInDemoMode()) {
      // Return demo bots in demo mode
      const demoBots = demoService.getDemoBots();
      return res.json({
        bots: demoBots.map((bot) => ({
          ...bot,
          id: bot.id,
          name: bot.name,
          messageProvider: bot.messageProvider,
          llmProvider: bot.llmProvider,
          persona: bot.persona,
          systemInstruction: bot.systemInstruction,
          status: 'demo',
          connected: true,
          isDemo: true,
        })),
        warnings: ['Running in demo mode - configure API keys to enable production mode'],
        legacyMode: false,
        environment: process.env.NODE_ENV || 'development',
        isDemoMode: true,
      });
    }

    const botManager = BotManager.getInstance();
    const bots = await botManager.getAllBots();
    const manager = BotConfigurationManager.getInstance();
    const warnings = manager.getWarnings();
    const userConfigStore = UserConfigStore.getInstance();

    // Redact sensitive information
    // Bots default to active/connected unless explicitly disabled via user config
    const sanitizedBots = bots.map((bot) => {
      // Merge config into top-level for frontend compatibility
      const mergedBot: any = {
        ...bot,
        ...(bot.config || {}),
      };

      const isDisabled = userConfigStore.isBotDisabled(mergedBot.name);
      return {
        ...mergedBot,
        // Use name as the ID since that's what the bots API expects
        id: mergedBot.id || mergedBot.name,
        // If disabled in user config, set status to 'disabled', otherwise 'active'
        status: isDisabled ? 'disabled' : mergedBot.status || 'active',
        // If disabled, set connected to false
        connected: isDisabled ? false : mergedBot.connected !== false,
        discord: mergedBot.discord
          ? {
              ...mergedBot.discord,
              token: redactSensitiveInfo('DISCORD_BOT_TOKEN', mergedBot.discord.token || ''),
            }
          : undefined,
        slack: mergedBot.slack
          ? {
              ...mergedBot.slack,
              botToken: redactSensitiveInfo('SLACK_BOT_TOKEN', mergedBot.slack.botToken || ''),
              appToken: redactSensitiveInfo('SLACK_APP_TOKEN', mergedBot.slack.appToken || ''),
              signingSecret: redactSensitiveInfo(
                'SLACK_SIGNING_SECRET',
                mergedBot.slack.signingSecret || ''
              ),
            }
          : undefined,
        openai: mergedBot.openai
          ? {
              ...mergedBot.openai,
              apiKey: redactSensitiveInfo('OPENAI_API_KEY', mergedBot.openai.apiKey || ''),
            }
          : undefined,
        flowise: mergedBot.flowise
          ? {
              ...mergedBot.flowise,
              apiKey: redactSensitiveInfo('FLOWISE_API_KEY', mergedBot.flowise.apiKey || ''),
            }
          : undefined,
        openwebui: mergedBot.openwebui
          ? {
              ...mergedBot.openwebui,
              apiKey: redactSensitiveInfo('OPENWEBUI_API_KEY', mergedBot.openwebui.apiKey || ''),
            }
          : undefined,
        openswarm: mergedBot.openswarm
          ? {
              ...mergedBot.openswarm,
              apiKey: redactSensitiveInfo('OPENSWARM_API_KEY', mergedBot.openswarm.apiKey || ''),
            }
          : undefined,
        metadata: buildFieldMetadata(mergedBot, userConfigStore),
      };
    });

    return res.json({
      bots: sanitizedBots,
      warnings,
      legacyMode: manager.isLegacyMode(),
      environment: process.env.NODE_ENV || 'development',
      isDemoMode: false,
    });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    const errorInfo = ErrorUtils.classifyError(hivemindError);

    console.error('Config API error:', {
      message: hivemindError.message,
      code: hivemindError.code,
      type: errorInfo.type,
      severity: errorInfo.severity,
      stack: process.env.NODE_ENV === 'test' ? hivemindError.stack : undefined,
    });

    return res.status(hivemindError.statusCode || 500).json({
      error: hivemindError.message,
      code: hivemindError.code || 'CONFIG_API_ERROR',
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV === 'test' && { stack: hivemindError.stack }),
    });
  }
});

// Get configuration sources (env vars vs config files)
router.get('/sources', async (req, res) => {
  try {
    const envVars = Object.keys(process.env)
      .filter(
        (key) =>
          key.startsWith('BOTS_') ||
          key.includes('DISCORD_') ||
          key.includes('SLACK_') ||
          key.includes('OPENAI_') ||
          key.includes('FLOWISE_') ||
          key.includes('OPENWEBUI_') ||
          key.includes('MATTERMOST_') ||
          key.includes('MESSAGE_') ||
          key.includes('WEBHOOK_')
      )
      .reduce(
        (acc, key) => {
          acc[key] = {
            source: 'environment',
            value: redactSensitiveInfo(key, process.env[key] || ''),
            sensitive:
              key.toLowerCase().includes('token') ||
              key.toLowerCase().includes('key') ||
              key.toLowerCase().includes('secret'),
          };
          return acc;
        },
        {} as Record<string, any>
      );

    // Detect config files
    const configDir = path.join(__dirname, '../../../config');
    let configFiles: Record<string, any>[] = [];

    try {
      const files = await fs.promises.readdir(configDir);
      const statsPromises = files
        .filter((file) => file.endsWith('.json') || file.endsWith('.js') || file.endsWith('.ts'))
        .map(async (file) => {
          const filePath = path.join(configDir, file);
          try {
            const stats = await fs.promises.stat(filePath);
            return {
              name: file,
              path: filePath,
              size: stats.size,
              modified: stats.mtime,
              type: path.extname(file).slice(1),
            };
          } catch (e) {
            console.warn(`Could not stat file ${file}:`, e);
            return null;
          }
        });

      const results = await Promise.all(statsPromises);
      configFiles = results.filter((r) => r !== null) as Record<string, any>[];
    } catch (fileError) {
      console.warn('Could not read config directory:', fileError);
    }

    // Detect overrides (env vars that override config file values)
    const overrides: Record<string, any>[] = [];
    const manager = BotConfigurationManager.getInstance();
    let bots: any[] = [];
    try {
      const res = (manager as any).getAllBots?.();
      if (Array.isArray(res)) {
        bots = res;
      }
    } catch {
      bots = [];
    }

    bots.forEach((bot) => {
      // Check for environment variable overrides
      const envKeys = Object.keys(process.env);
      const botName = bot.name.toLowerCase().replace(/\s+/g, '_');

      envKeys.forEach((envKey) => {
        if (
          envKey.toLowerCase().includes(botName) ||
          envKey.includes('DISCORD_') ||
          envKey.includes('SLACK_') ||
          envKey.includes('OPENAI_')
        ) {
          overrides.push({
            key: envKey,
            value: redactSensitiveInfo(envKey, process.env[envKey] || ''),
            bot: bot.name,
            type: 'environment_override',
          });
        }
      });
    });

    return res.json({
      environmentVariables: envVars,
      configFiles,
      overrides,
    });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    const errorInfo = ErrorUtils.classifyError(hivemindError);

    console.error('Config sources API error:', {
      message: hivemindError.message,
      code: hivemindError.code,
      type: errorInfo.type,
      severity: errorInfo.severity,
    });

    return res.status(hivemindError.statusCode || 500).json({
      error: hivemindError.message,
      code: hivemindError.code || 'CONFIG_SOURCES_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
});

// Reload configuration
router.post('/reload', (req, res) => {
  try {
    const manager = BotConfigurationManager.getInstance();
    debug('Manager instance obtained:', !!manager);
    manager.reload();

    // Skip audit logging entirely in test mode
    if (process.env.NODE_ENV !== 'test') {
      try {
        logConfigChange(
          req,
          'RELOAD',
          'config/global',
          'success',
          'Configuration reloaded from files'
        );
      } catch (auditError) {
        console.warn('Audit logging failed:', auditError);
      }
    }

    return res.json({
      success: true,
      message: 'Configuration reloaded successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    const errorInfo = ErrorUtils.classifyError(hivemindError);

    console.error('Config reload error:', {
      message: hivemindError.message,
      code: hivemindError.code,
      type: errorInfo.type,
      severity: errorInfo.severity,
    });

    // Skip audit logging entirely in test mode
    if (process.env.NODE_ENV !== 'test') {
      try {
        logConfigChange(
          req,
          'RELOAD',
          'config/global',
          'failure',
          `Configuration reload failed: ${hivemindError.message}`
        );
      } catch (auditError) {
        console.warn('Audit logging failed:', auditError);
      }
    }

    return res.status(hivemindError.statusCode || 500).json({
      error: hivemindError.message,
      code: hivemindError.code || 'CONFIG_RELOAD_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
});

// Clear cache
router.post('/api/cache/clear', (req, res) => {
  try {
    // Clear any in-memory caches
    if ((global as any).configCache) {
      (global as any).configCache = {};
    }

    // Force reload configuration to clear any internal caches
    const manager = BotConfigurationManager.getInstance();
    debug('Manager instance obtained:', !!manager);
    manager.reload();

    // No audit logging needed in test mode

    return res.json({
      success: true,
      message: 'Cache cleared successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    const errorInfo = ErrorUtils.classifyError(hivemindError);

    console.error('Cache clear error:', {
      message: hivemindError.message,
      code: hivemindError.code,
      type: errorInfo.type,
      severity: errorInfo.severity,
    });

    return res.status(hivemindError.statusCode || 500).json({
      error: hivemindError.message,
      code: hivemindError.code || 'CACHE_CLEAR_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
});

// Export configuration
router.get('/export', (req, res) => {
  try {
    const manager = BotConfigurationManager.getInstance();
    debug('Manager instance obtained:', !!manager);
    const bots = manager.getAllBots();
    debug('Bots obtained:', bots.length);
    const warnings = manager.getWarnings();
    debug('Warnings obtained:', warnings);

    // Create export data with current timestamp
    const exportData = {
      exportTimestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || 'unknown',
      bots: bots,
      warnings: warnings,
      legacyMode: manager.isLegacyMode(),
    };

    // Convert to JSON and create blob
    const jsonContent = JSON.stringify(exportData, null, 2);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="config-export-${Date.now()}.json"`);
    debug('Headers set, about to send response');
    return res.send(jsonContent);
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    const errorInfo = ErrorUtils.classifyError(hivemindError);

    console.error('Config export error:', {
      message: hivemindError.message,
      code: hivemindError.code,
      type: errorInfo.type,
      severity: errorInfo.severity,
    });

    return res.status(hivemindError.statusCode || 500).json({
      error: hivemindError.message,
      code: hivemindError.code || 'CONFIG_EXPORT_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
});

// Validate configuration
router.get('/validate', (req, res) => {
  try {
    const manager = BotConfigurationManager.getInstance();
    const bots = manager.getAllBots();
    const errors = [];

    // Basic validation
    if (!Array.isArray(bots)) {
      errors.push({ field: 'bots', message: 'Bots must be an array' });
    } else {
      bots.forEach((bot: any, index: number) => {
        if (!bot.name) {
          errors.push({ field: `bots[${index}].name`, message: 'Bot name is required' });
        }
        if (!bot.llmProvider) {
          errors.push({ field: `bots[${index}].llmProvider`, message: 'LLM provider is required' });
        }
        if (!bot.messageProvider) {
          errors.push({
            field: `bots[${index}].messageProvider`,
            message: 'Message provider is required',
          });
        }
      });
    }

    return res.json({
      valid: errors.length === 0,
      errors,
    });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    const errorInfo = ErrorUtils.classifyError(hivemindError);

    console.error('Config validation error:', {
      message: hivemindError.message,
      code: hivemindError.code,
      type: errorInfo.type,
      severity: errorInfo.severity,
    });

    return res.status(hivemindError.statusCode || 500).json({
      error: hivemindError.message,
      code: hivemindError.code || 'CONFIG_VALIDATION_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
});

// Create configuration backup
router.post('/backup', validateRequest(ConfigBackupSchema), (req: any, res) => {
  try {
    const manager = BotConfigurationManager.getInstance();
    const bots = manager.getAllBots();
    const warnings = manager.getWarnings();

    const backupId = `backup_${Date.now()}`;

    // In a real implementation, this would save to a file or database
    // For now, just return success

    return res.json({
      backupId,
      timestamp: new Date().toISOString(),
      message: 'Configuration backup created successfully',
    });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    const errorInfo = ErrorUtils.classifyError(hivemindError);

    console.error('Config backup error:', {
      message: hivemindError.message,
      code: hivemindError.code,
      type: errorInfo.type,
      severity: errorInfo.severity,
    });

    return res.status(hivemindError.statusCode || 500).json({
      error: hivemindError.message,
      code: hivemindError.code || 'CONFIG_BACKUP_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
});

// Restore configuration from backup
router.post('/restore', validateRequest(ConfigRestoreSchema), (req: any, res) => {
  try {
    const { backupId } = req.body;

    if (!backupId) {
      return res.status(400).json({ error: 'backupId is required' });
    }

    // In a real implementation, this would restore from a file or database
    // For now, just return success

    return res.json({
      success: true,
      restored: backupId,
      message: 'Configuration restored successfully',
    });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    const errorInfo = ErrorUtils.classifyError(hivemindError);

    console.error('Config restore error:', {
      message: hivemindError.message,
      code: hivemindError.code,
      type: errorInfo.type,
      severity: errorInfo.severity,
    });

    return res.status(hivemindError.statusCode || 500).json({
      error: hivemindError.message,
      code: hivemindError.code || 'CONFIG_RESTORE_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
});

// WebUI health endpoint
router.get('/api/health', (req, res) => {
  return res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'webui',
  });
});

// OpenAPI documentation endpoint
router.get('/api/openapi', (req, res) => {
  try {
    const openapiSpec = {
      openapi: '3.0.0',
      info: {
        title: 'Open-Hivemind WebUI API',
        version: '1.0.0',
        description: 'API for managing Open-Hivemind configuration',
      },
      paths: {
        '/api/config': {
          get: {
            summary: 'Get configuration',
            responses: {
              200: { description: 'Configuration retrieved successfully' },
            },
          },
        },
        '/api/config/validate': {
          get: {
            summary: 'Validate configuration',
            responses: {
              200: { description: 'Configuration validation result' },
            },
          },
        },
        '/api/config/reload': {
          post: {
            summary: 'Reload configuration',
            responses: {
              200: { description: 'Configuration reloaded successfully' },
            },
          },
        },
        '/api/config/backup': {
          post: {
            summary: 'Create configuration backup',
            responses: {
              200: { description: 'Configuration backup created successfully' },
            },
          },
        },
        '/api/config/llm-profiles': {
          get: {
            summary: 'Get LLM profile templates',
            responses: {
              200: { description: 'LLM profiles retrieved successfully' },
            },
          },
          put: {
            summary: 'Update LLM profile templates',
            responses: {
              200: { description: 'LLM profiles updated successfully' },
            },
          },
        },
        '/api/config/llm-status': {
          get: {
            summary: 'Get LLM default status and missing-provider summary',
            responses: {
              200: { description: 'LLM status retrieved successfully' },
            },
          },
        },
        '/api/config/message-provider/test': {
          post: {
            summary: 'Test message provider connectivity',
            responses: {
              200: { description: 'Message provider connectivity result' },
            },
          },
        },
        '/api/config/restore': {
          post: {
            summary: 'Restore configuration from backup',
            responses: {
              200: { description: 'Configuration restored successfully' },
            },
          },
        },
        '/api/health': {
          get: {
            summary: 'WebUI health check',
            responses: {
              200: { description: 'WebUI is healthy' },
            },
          },
        },
      },
    };
    return res.json(openapiSpec);
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    const errorInfo = ErrorUtils.classifyError(hivemindError);

    console.error('OpenAPI generation error:', {
      message: hivemindError.message,
      code: hivemindError.code,
      type: errorInfo.type,
      severity: errorInfo.severity,
    });

    return res.status(hivemindError.statusCode || 500).json({
      error: hivemindError.message,
      code: hivemindError.code || 'OPENAPI_GENERATION_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
});

function buildFieldMetadata(
  bot: any,
  store: ReturnType<typeof UserConfigStore.getInstance>
): Record<string, any> {
  const botName: string = bot?.name || 'unknown';
  const overrides = store.getBotOverride(botName) || {};

  const describeField = (field: string, envKey: string) => {
    const envVar = `BOTS_${botName.toUpperCase()}_${envKey}`;
    const hasEnv = process.env[envVar] !== undefined && process.env[envVar] !== '';
    const hasOverride = overrides && (overrides as Record<string, any>)[field] !== undefined;

    return {
      source: hasEnv ? 'env' : hasOverride ? 'user' : 'default',
      locked: hasEnv,
      envVar: hasEnv ? envVar : undefined,
      override: hasOverride,
    };
  };

  return {
    messageProvider: describeField('messageProvider', 'MESSAGE_PROVIDER'),
    llmProvider: describeField('llmProvider', 'LLM_PROVIDER'),
    llmProfile: describeField('llmProfile', 'LLM_PROFILE'),
    responseProfile: describeField('responseProfile', 'RESPONSE_PROFILE'),
    persona: describeField('persona', 'PERSONA'),
    systemInstruction: describeField('systemInstruction', 'SYSTEM_INSTRUCTION'),
    mcpServers: describeField('mcpServers', 'MCP_SERVERS'),
    mcpGuard: describeField('mcpGuard', 'MCP_GUARD'),
    mcpGuardProfile: describeField('mcpGuardProfile', 'MCP_GUARD_PROFILE'),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Messaging Behavior Configuration Endpoints
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/config/messaging - Get messaging behavior settings
router.get('/messaging', (req, res) => {
  try {
    return res.json({
      MESSAGE_ONLY_WHEN_SPOKEN_TO: messageConfig.get('MESSAGE_ONLY_WHEN_SPOKEN_TO'),
      MESSAGE_ALLOW_BOT_TO_BOT_UNADDRESSED: messageConfig.get(
        'MESSAGE_ALLOW_BOT_TO_BOT_UNADDRESSED'
      ),
      MESSAGE_UNSOLICITED_ADDRESSED: messageConfig.get('MESSAGE_UNSOLICITED_ADDRESSED'),
      MESSAGE_UNSOLICITED_UNADDRESSED: messageConfig.get('MESSAGE_UNSOLICITED_UNADDRESSED'),
      MESSAGE_UNSOLICITED_BASE_CHANCE: messageConfig.get('MESSAGE_UNSOLICITED_BASE_CHANCE'),
      MESSAGE_ONLY_WHEN_SPOKEN_TO_GRACE_WINDOW_MS: messageConfig.get(
        'MESSAGE_ONLY_WHEN_SPOKEN_TO_GRACE_WINDOW_MS'
      ),
      MESSAGE_RESPONSE_PROFILES: messageConfig.get('MESSAGE_RESPONSE_PROFILES'),
    });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    return res.status(hivemindError.statusCode || 500).json({
      error: hivemindError.message,
      code: 'MESSAGING_CONFIG_GET_ERROR',
    });
  }
});

// GET /api/config/guardrails - Get MCP guardrail profiles
router.get('/guardrails', (req, res) => {
  try {
    return res.json({
      profiles: getGuardrailProfiles(),
    });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    return res.status(hivemindError.statusCode || 500).json({
      error: hivemindError.message,
      code: 'GUARDRAIL_CONFIG_GET_ERROR',
    });
  }
});

// PUT /api/config/guardrails - Update MCP guardrail profiles
router.put('/guardrails', (req, res) => {
  try {
    const payload = req.body;
    const profiles = payload?.profiles;
    if (!Array.isArray(profiles)) {
      return res.status(400).json({ error: 'profiles must be an array' });
    }

    for (const profile of profiles) {
      if (!profile || typeof profile !== 'object') {
        return res.status(400).json({ error: 'profile entries must be objects' });
      }
      const typed = profile as GuardrailProfile;
      if (!typed.id || typeof typed.id !== 'string') {
        return res.status(400).json({ error: 'profile.id is required' });
      }
      if (!typed.name || typeof typed.name !== 'string') {
        return res.status(400).json({ error: 'profile.name is required' });
      }
      if (!typed.guards || typeof typed.guards !== 'object') {
        return res.status(400).json({ error: `profile.guards is required for ${typed.id}` });
      }
    }

    saveGuardrailProfiles(profiles);
    return res.json({ success: true, profiles });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    return res.status(hivemindError.statusCode || 500).json({
      error: hivemindError.message,
      code: 'GUARDRAIL_CONFIG_PUT_ERROR',
    });
  }
});

// POST /api/config/guardrails - Create a guardrail profile
router.post('/guardrails', (req, res) => {
  try {
    const profile = req.body as GuardrailProfile;
    if (!profile.id || typeof profile.id !== 'string') {
      return res.status(400).json({ error: 'profile.id is required' });
    }
    if (!profile.name || typeof profile.name !== 'string') {
      return res.status(400).json({ error: 'profile.name is required' });
    }
    if (!profile.guards || typeof profile.guards !== 'object') {
      return res.status(400).json({ error: 'profile.guards is required' });
    }

    const profiles = getGuardrailProfiles();
    if (profiles.some((p) => p.id === profile.id)) {
      return res.status(409).json({ error: `Profile with id '${profile.id}' already exists` });
    }

    profiles.push(profile);
    saveGuardrailProfiles(profiles);
    return res.status(201).json({ success: true, profile });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    return res.status(hivemindError.statusCode || 500).json({
      error: hivemindError.message,
      code: 'GUARDRAIL_CONFIG_POST_ERROR',
    });
  }
});

// DELETE /api/config/guardrails/:key - Delete a guardrail profile
router.delete('/guardrails/:key', (req, res) => {
  try {
    const key = req.params.key;
    const profiles = getGuardrailProfiles();
    const index = profiles.findIndex((p) => p.id === key);

    if (index === -1) {
      return res.status(404).json({ error: `Profile with id '${key}' not found` });
    }

    profiles.splice(index, 1);
    saveGuardrailProfiles(profiles);
    return res.json({ success: true, deletedKey: key });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    return res.status(hivemindError.statusCode || 500).json({
      error: hivemindError.message,
      code: 'GUARDRAIL_CONFIG_DELETE_ERROR',
    });
  }
});

// GET /api/config/response-profiles - Get response/engagement profiles
router.get('/response-profiles', (req, res) => {
  try {
    return res.json({
      profiles: getResponseProfiles(),
    });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    return res.status(hivemindError.statusCode || 500).json({
      error: hivemindError.message,
      code: 'RESPONSE_PROFILE_GET_ERROR',
    });
  }
});

// POST /api/config/response-profiles - Create a response profile
router.post('/response-profiles', (req, res) => {
  try {
    const profile = req.body as ResponseProfile;
    if (!profile.key || typeof profile.key !== 'string') {
      return res.status(400).json({ error: 'profile.key is required' });
    }
    if (!profile.name || typeof profile.name !== 'string') {
      return res.status(400).json({ error: 'profile.name is required' });
    }
    if (!profile.settings || typeof profile.settings !== 'object') {
      return res.status(400).json({ error: 'profile.settings is required' });
    }

    const created = createResponseProfile(profile);
    return res.status(201).json({ success: true, profile: created });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    const statusCode = hivemindError.message?.includes('already exists')
      ? 409
      : hivemindError.statusCode || 500;
    return res.status(statusCode).json({
      error: hivemindError.message,
      code: 'RESPONSE_PROFILE_POST_ERROR',
    });
  }
});

// PUT /api/config/response-profiles/:key - Update a response profile
router.put('/response-profiles/:key', (req, res) => {
  try {
    const key = req.params.key;
    const updates = req.body as Partial<ResponseProfile>;

    const updated = updateResponseProfile(key, updates);
    return res.json({ success: true, profile: updated });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    const statusCode = hivemindError.message?.includes('not found')
      ? 404
      : hivemindError.statusCode || 500;
    return res.status(statusCode).json({
      error: hivemindError.message,
      code: 'RESPONSE_PROFILE_PUT_ERROR',
    });
  }
});

// DELETE /api/config/response-profiles/:key - Delete a response profile
router.delete('/response-profiles/:key', (req, res) => {
  try {
    const key = req.params.key;
    deleteResponseProfile(key);
    return res.json({ success: true, deletedKey: key });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    const statusCode = hivemindError.message?.includes('not found')
      ? 404
      : hivemindError.message?.includes('built-in')
        ? 403
        : hivemindError.statusCode || 500;
    return res.status(statusCode).json({
      error: hivemindError.message,
      code: 'RESPONSE_PROFILE_DELETE_ERROR',
    });
  }
});

// GET /api/config/llm-status - LLM default + missing provider summary
router.get('/llm-status', async (req, res) => {
  try {
    const llmDefaults = getLlmDefaultStatus();
    const botManager = BotManager.getInstance();
    const bots = await botManager.getAllBots();
    const missing = bots.filter((bot) => !bot.llmProvider || String(bot.llmProvider).trim() === '');

    return res.json({
      defaultConfigured: llmDefaults.configured,
      defaultProviders: llmDefaults.providers,
      libraryStatus: llmDefaults.libraryStatus,
      botsMissingLlmProvider: missing.map((bot) => bot.name),
      hasMissing: missing.length > 0,
    });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    return res.status(hivemindError.statusCode || 500).json({
      error: hivemindError.message,
      code: 'LLM_STATUS_GET_ERROR',
    });
  }
});

// POST /api/config/message-provider/test - Test message provider connectivity
router.post('/message-provider/test', async (req, res) => {
  try {
    const provider = String(req.body?.provider || '')
      .trim()
      .toLowerCase();
    const config = req.body?.config as Record<string, unknown> | undefined;

    if (!provider) {
      return res.status(400).json({ error: 'provider is required' });
    }

    if (!config || typeof config !== 'object') {
      return res.status(400).json({ error: 'config is required' });
    }

    if (provider === 'discord') {
      const rawToken = String((config as any).DISCORD_BOT_TOKEN || (config as any).token || '');
      const token = rawToken.split(',')[0]?.trim() || '';
      const { testDiscordConnection } = await import('@hivemind/adapter-discord');
      const result = await testDiscordConnection(token);
      return res.json(result);
    }

    if (provider === 'slack') {
      const token = String(
        (config as any).SLACK_BOT_TOKEN || (config as any).botToken || ''
      ).trim();
      const result = await testSlackConnection(token);
      return res.json(result);
    }

    if (provider === 'mattermost') {
      const serverUrl = String(
        (config as any).MATTERMOST_SERVER_URL ||
          (config as any).serverUrl ||
          (config as any).url ||
          ''
      ).trim();
      const token = String((config as any).MATTERMOST_TOKEN || (config as any).token || '').trim();
      const result = await testMattermostConnection(serverUrl, token);
      return res.json(result);
    }

    return res.status(400).json({ error: `Unsupported provider "${provider}"` });
  } catch (error: any) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    return res.status(hivemindError.statusCode || 500).json({
      error: hivemindError.message,
      code: 'MESSAGE_PROVIDER_TEST_ERROR',
    });
  }
});

// GET /api/config/message-profiles - Get Message profile templates
router.get('/message-profiles', (req, res) => {
  try {
    return res.json({
      profiles: getMessageProfiles(),
    });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    return res.status(hivemindError.statusCode || 500).json({
      error: hivemindError.message,
      code: 'MESSAGE_PROFILE_GET_ERROR',
    });
  }
});

// PUT /api/config/message-profiles - Update Message profile templates
router.put('/message-profiles', (req, res) => {
  try {
    const payload = req.body;
    const profiles = payload?.profiles;
    if (!profiles || typeof profiles !== 'object') {
      return res.status(400).json({ error: 'profiles must be an object' });
    }

    const messageProfiles = Array.isArray(profiles.message) ? profiles.message : null;
    if (!messageProfiles) {
      return res.status(400).json({ error: 'profiles.message must be an array' });
    }

    const validateProfile = (profile: any) => {
      if (!profile || typeof profile !== 'object') {
        return 'profile entries must be objects';
      }
      if (!profile.key || typeof profile.key !== 'string') {
        return 'profile.key is required';
      }
      if (!profile.provider || typeof profile.provider !== 'string') {
        return `profile.provider is required for ${profile.key}`;
      }
      if (profile.name && typeof profile.name !== 'string') {
        return `profile.name must be a string for ${profile.key}`;
      }
      if (profile.description && typeof profile.description !== 'string') {
        return `profile.description must be a string for ${profile.key}`;
      }
      if (profile.config && typeof profile.config !== 'object') {
        return `profile.config must be an object for ${profile.key}`;
      }
      return null;
    };

    for (const profile of messageProfiles) {
      const error = validateProfile(profile);
      if (error) {
        return res.status(400).json({ error });
      }
    }

    saveMessageProfiles({ message: messageProfiles });
    return res.json({ success: true, profiles: { message: messageProfiles } });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    return res.status(hivemindError.statusCode || 500).json({
      error: hivemindError.message,
      code: 'MESSAGE_PROFILE_PUT_ERROR',
    });
  }
});

// POST /api/config/message-profiles - Create a Message profile
router.post('/message-profiles', (req, res) => {
  try {
    const profile = req.body as MessageProfile;
    if (!profile.key || typeof profile.key !== 'string') {
      return res.status(400).json({ error: 'profile.key is required' });
    }
    if (!profile.provider || typeof profile.provider !== 'string') {
      return res.status(400).json({ error: 'profile.provider is required' });
    }

    const allProfiles = getMessageProfiles();
    if (allProfiles.message.some((p) => p.key === profile.key)) {
      return res.status(409).json({ error: `Profile with key '${profile.key}' already exists` });
    }

    const newProfile: MessageProfile = {
      key: profile.key,
      name: profile.name || profile.key,
      description: profile.description,
      provider: profile.provider,
      config: profile.config || {},
    };

    allProfiles.message.push(newProfile);
    saveMessageProfiles(allProfiles);
    return res.status(201).json({ success: true, profile: newProfile });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    return res.status(hivemindError.statusCode || 500).json({
      error: hivemindError.message,
      code: 'MESSAGE_PROFILE_POST_ERROR',
    });
  }
});

// DELETE /api/config/message-profiles/:key - Delete a Message profile
router.delete('/message-profiles/:key', (req, res) => {
  try {
    const key = req.params.key;
    const allProfiles = getMessageProfiles();
    const index = allProfiles.message.findIndex((p) => p.key === key);

    if (index === -1) {
      return res.status(404).json({ error: `Profile with key '${key}' not found` });
    }

    allProfiles.message.splice(index, 1);
    saveMessageProfiles(allProfiles);
    return res.json({ success: true, deletedKey: key });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    return res.status(hivemindError.statusCode || 500).json({
      error: hivemindError.message,
      code: 'MESSAGE_PROFILE_DELETE_ERROR',
    });
  }
});

// GET /api/config/llm-profiles - Get LLM profile templates
router.get('/llm-profiles', (req, res) => {
  try {
    // Check for demo mode
    const demoService = DemoModeService.getInstance();

    if (demoService.isInDemoMode()) {
      // Return demo LLM profiles
      return res.json({
        profiles: {
          llm: [
            {
              key: 'demo-openai',
              name: 'Demo OpenAI Profile',
              description: 'Demo profile for OpenAI - configure API key to enable',
              provider: 'openai',
              config: {
                model: 'gpt-4',
                temperature: 0.7,
              },
            },
            {
              key: 'demo-flowise',
              name: 'Demo Flowise Profile',
              description: 'Demo profile for Flowise - configure API key to enable',
              provider: 'flowise',
              config: {
                apiBaseUrl: 'http://localhost:3000/api/v1',
              },
            },
          ],
        },
        isDemo: true,
      });
    }

    return res.json({
      profiles: getLlmProfiles(),
    });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    return res.status(hivemindError.statusCode || 500).json({
      error: hivemindError.message,
      code: 'LLM_PROFILE_GET_ERROR',
    });
  }
});

// PUT /api/config/llm-profiles - Update LLM profile templates
router.put('/llm-profiles', (req, res) => {
  try {
    const payload = req.body;
    const profiles = payload?.profiles;
    if (!profiles || typeof profiles !== 'object') {
      return res.status(400).json({ error: 'profiles must be an object' });
    }

    const llmProfiles = Array.isArray(profiles.llm) ? profiles.llm : null;
    if (!llmProfiles) {
      return res.status(400).json({ error: 'profiles.llm must be an array' });
    }

    const validateProfile = (profile: any) => {
      if (!profile || typeof profile !== 'object') {
        return 'profile entries must be objects';
      }
      if (!profile.key || typeof profile.key !== 'string') {
        return 'profile.key is required';
      }
      if (!profile.provider || typeof profile.provider !== 'string') {
        return `profile.provider is required for ${profile.key}`;
      }
      if (profile.name && typeof profile.name !== 'string') {
        return `profile.name must be a string for ${profile.key}`;
      }
      if (profile.description && typeof profile.description !== 'string') {
        return `profile.description must be a string for ${profile.key}`;
      }
      if (profile.config && typeof profile.config !== 'object') {
        return `profile.config must be an object for ${profile.key}`;
      }
      return null;
    };

    for (const profile of llmProfiles) {
      const error = validateProfile(profile);
      if (error) {
        return res.status(400).json({ error });
      }
    }

    saveLlmProfiles({ llm: llmProfiles });
    return res.json({ success: true, profiles: { llm: llmProfiles } });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    return res.status(hivemindError.statusCode || 500).json({
      error: hivemindError.message,
      code: 'LLM_PROFILE_PUT_ERROR',
    });
  }
});

// POST /api/config/llm-profiles - Create an LLM profile
router.post('/llm-profiles', (req, res) => {
  try {
    const profile = req.body as ProviderProfile;
    if (!profile.key || typeof profile.key !== 'string') {
      return res.status(400).json({ error: 'profile.key is required' });
    }
    if (!profile.provider || typeof profile.provider !== 'string') {
      return res.status(400).json({ error: 'profile.provider is required' });
    }

    const allProfiles = getLlmProfiles();
    if (allProfiles.llm.some((p) => p.key === profile.key)) {
      return res.status(409).json({ error: `Profile with key '${profile.key}' already exists` });
    }

    const newProfile: ProviderProfile = {
      key: profile.key,
      name: profile.name || profile.key,
      description: profile.description,
      provider: profile.provider,
      config: profile.config || {},
    };

    allProfiles.llm.push(newProfile);
    saveLlmProfiles(allProfiles);
    return res.status(201).json({ success: true, profile: newProfile });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    return res.status(hivemindError.statusCode || 500).json({
      error: hivemindError.message,
      code: 'LLM_PROFILE_POST_ERROR',
    });
  }
});

// PUT /api/config/llm-profiles/:key - Update an LLM profile
router.put('/llm-profiles/:key', (req, res) => {
  try {
    const key = req.params.key;
    const updates = req.body;

    const allProfiles = getLlmProfiles();
    const index = allProfiles.llm.findIndex((p) => p.key.toLowerCase() === key.toLowerCase());

    if (index === -1) {
      return res.status(404).json({ error: `Profile with key '${key}' not found` });
    }

    // Merge updates
    const updatedProfile = {
      ...allProfiles.llm[index],
      ...updates,
      // Ensure the key remains consistent unless we want to support renaming here (which is complex)
      // But let's allow the body to specify key if it matches, otherwise ignore or validate?
      // For safety, let's keep the original key or ensure it matches.
      // If we want to rename, we should likely use a different flow or handle it carefully.
      // For now, force key to match params/original to avoid accidental duplicates.
      key: allProfiles.llm[index].key,
    };

    if (
      !updatedProfile.name ||
      typeof updatedProfile.name !== 'string' ||
      updatedProfile.name.trim() === ''
    ) {
      return res.status(400).json({ error: 'profile.name is required and must not be empty' });
    }
    if (
      !updatedProfile.provider ||
      typeof updatedProfile.provider !== 'string' ||
      updatedProfile.provider.trim() === ''
    ) {
      return res.status(400).json({ error: 'profile.provider is required and must not be empty' });
    }

    allProfiles.llm[index] = updatedProfile;
    saveLlmProfiles(allProfiles);
    return res.json({ success: true, profile: updatedProfile });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    return res.status(hivemindError.statusCode || 500).json({
      error: hivemindError.message,
      code: 'LLM_PROFILE_UPDATE_ERROR',
    });
  }
});

// DELETE /api/config/llm-profiles/:key - Delete an LLM profile
router.delete('/llm-profiles/:key', (req, res) => {
  try {
    const key = req.params.key;
    const allProfiles = getLlmProfiles();
    const index = allProfiles.llm.findIndex((p) => p.key === key);

    if (index === -1) {
      return res.status(404).json({ error: `Profile with key '${key}' not found` });
    }

    allProfiles.llm.splice(index, 1);
    saveLlmProfiles(allProfiles);
    return res.json({ success: true, deletedKey: key });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    return res.status(hivemindError.statusCode || 500).json({
      error: hivemindError.message,
      code: 'LLM_PROFILE_DELETE_ERROR',
    });
  }
});

// PUT /api/config/messaging - Update messaging behavior settings
router.put('/messaging', async (req, res) => {
  try {
    const updates = req.body;
    const configDir = process.env.NODE_CONFIG_DIR || path.join(process.cwd(), 'config');
    const targetPath = path.join(configDir, 'providers', 'message.json');

    // Load existing file or start fresh
    let existing: Record<string, any> = {};
    try {
      const data = await fs.promises.readFile(targetPath, 'utf-8');
      existing = JSON.parse(data);
    } catch {
      /* ignore parse errors, start fresh */
    }

    // Merge updates
    const merged = { ...existing, ...updates };

    // Write back
    await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.promises.writeFile(targetPath, JSON.stringify(merged, null, 2));

    // Reload config (convict will pick up new values on next get, but we force load here)
    try {
      // Use load() with object to avoid synchronous file read in loadFile()
      messageConfig.load(merged);
    } catch {
      /* validation may fail, ignore */
    }

    return res.json({
      success: true,
      message: 'Messaging settings updated. Restart may be required for some settings.',
      savedTo: targetPath,
      values: merged,
    });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    return res.status(hivemindError.statusCode || 500).json({
      error: hivemindError.message,
      code: 'MESSAGING_CONFIG_PUT_ERROR',
    });
  }
});

// ========================================
// MCP Server Profiles API
// ========================================

// GET all MCP server profiles
router.get('/mcp-server-profiles', (_req, res) => {
  try {
    const profiles = getMcpServerProfiles();
    return res.json({ profiles });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    return res.status(hivemindError.statusCode || 500).json({
      error: hivemindError.message,
      code: 'MCP_SERVER_PROFILES_GET_ERROR',
    });
  }
});

// POST create new MCP server profile
router.post('/mcp-server-profiles', (req, res) => {
  try {
    const { key, name, description, mcpServers } = req.body;

    if (!key || typeof key !== 'string') {
      return res.status(400).json({ error: 'Profile key is required' });
    }
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Profile name is required' });
    }
    if (!Array.isArray(mcpServers)) {
      return res.status(400).json({ error: 'mcpServers must be an array' });
    }

    const profile = createMcpServerProfile({
      key,
      name,
      description,
      mcpServers,
    });

    return res.status(201).json({ success: true, profile });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    return res.status(hivemindError.statusCode || 400).json({
      error: hivemindError.message,
      code: 'MCP_SERVER_PROFILE_CREATE_ERROR',
    });
  }
});

// PUT update MCP server profile
router.put('/mcp-server-profiles/:key', (req, res) => {
  try {
    const { key } = req.params;
    const updates = req.body;

    const updated = updateMcpServerProfile(key, updates);
    if (!updated) {
      return res.status(404).json({ error: `Profile "${key}" not found` });
    }

    return res.json({ success: true, profile: updated });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    return res.status(hivemindError.statusCode || 500).json({
      error: hivemindError.message,
      code: 'MCP_SERVER_PROFILE_UPDATE_ERROR',
    });
  }
});

// DELETE MCP server profile
router.delete('/mcp-server-profiles/:key', (req, res) => {
  try {
    const { key } = req.params;
    const deleted = deleteMcpServerProfile(key);
    if (!deleted) {
      return res.status(404).json({ error: `Profile "${key}" not found` });
    }

    return res.json({ success: true, message: `Profile "${key}" deleted` });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    return res.status(hivemindError.statusCode || 500).json({
      error: hivemindError.message,
      code: 'MCP_SERVER_PROFILE_DELETE_ERROR',
    });
  }
});

// Catch-all route for debugging - MUST BE LAST
router.use('*', (req, res) => {
  debug('Config router catch-all:', req.method, req.originalUrl);
  return res.status(404).json({ error: 'Route not found in config router' });
});

export default router;
