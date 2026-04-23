/**
 * Service initialization logic.
 *
 * Extracted from src/index.ts — handles database connection, provider init,
 * messenger service startup, LLM provider resolution, pipeline creation,
 * demo mode, anomaly detection, and webhook registration.
 */
import debug from 'debug';
import { loadLlmProfiles } from '@src/config/llmProfiles';
import { loadMemoryProfiles } from '@src/config/memoryProfiles';
import { loadToolProfiles } from '@src/config/toolProfiles';
import { container } from '@src/di/container';
import { registerServices } from '@src/di/registration';
import { SyncProviderRegistry, type ProviderProfile } from '@src/registries/SyncProviderRegistry';
import { BackupSchedulerService } from '@src/server/services/BackupSchedulerService';
import { BotHeartbeatService } from '@src/server/services/BotHeartbeatService';
import { BotTaskScheduler } from '@src/server/services/BotTaskScheduler';
import { DatabaseMaintenanceService } from '@src/server/services/DatabaseMaintenanceService';
import { ShutdownCoordinator } from '@src/server/ShutdownCoordinator';
import AnomalyDetectionService from '@src/services/AnomalyDetectionService';
import DemoModeService from '@src/services/DemoModeService';
import StartupGreetingService from '@src/services/StartupGreetingService';
import { validateRequiredEnvVars } from '@src/utils/envValidation';
import * as debugEnvVarsModule from '@config/debugEnvVars';
import * as messageConfigModule from '@config/messageConfig';
import * as webhookConfigModule from '@config/webhookConfig';
import { getLlmProvider } from '@llm/getLlmProvider';
import type { IMessage } from '@message/interfaces/IMessage';
import * as messengerProviderModule from '@message/management/getMessengerProvider';
import { IdleResponseManager } from '@message/management/IdleResponseManager';
import Logger from '@common/logger';
import { initProviders } from '../initProviders';
import startupDiagnostics from '../utils/startupDiagnostics';
import { reloadGlobalConfigs } from './routes/config';

const indexLog = debug('app:index');
const appLogger = Logger.withContext('app:index');
const skipMessengers = process.env.SKIP_MESSENGERS === 'true';

interface ConvictConfig {
  get(key: string): unknown;
}
const messageConfig = (messageConfigModule.default ||
  messageConfigModule) as unknown as ConvictConfig;
const webhookConfig = (webhookConfigModule.default ||
  webhookConfigModule) as unknown as ConvictConfig;

interface MessengerService {
  providerName?: string;
  botId?: string;
  initialize(): Promise<void>;
  setApp?(app: import('express').Application): void;
  setMessageHandler(
    handler: (
      message: any,
      historyMessages?: any[],
      botConfig?: Record<string, any>
    ) => Promise<string | null>
  ): void;
  getAgentStartupSummaries?(): Array<Record<string, string>>;
  getDefaultChannel?(): string | null;
  getChannels?(): string[];
  sendMessageToChannel?(channelId: string, text: string): Promise<any>;
  sendMessage?(channelId: string, text: string): Promise<any>;
  constructor?: { name?: string };
}

async function startBot(app: import('express').Application, messengerService: any) {
  const providerType =
    messengerService.providerName || messengerService.constructor?.name || 'Unknown';

  try {
    const messageHandlerModule = await import('@message/handlers/messageHandler');
    debugEnvVarsModule.debugEnvVars();
    indexLog('[DEBUG] Starting bot initialization...');
    if (typeof messengerService.setApp === 'function') {
      messengerService.setApp(app);
    }
    await messengerService.initialize();
    indexLog('[DEBUG] Bot initialization completed.');
    indexLog('[DEBUG] Setting up message handler...');

    // Initialize idle response manager
    const idleResponseManager = IdleResponseManager.getInstance();
    await idleResponseManager.initialize();

    if (process.env.USE_LEGACY_HANDLER !== 'true') {
      // Pipeline mode: emit onto the MessageBus so the 5-stage pipeline
      // (Receive -> Decision -> Enrich -> Inference -> Send) processes the message.
      const { MessageBus } = await import('@src/events/MessageBus');
      const bus = MessageBus.getInstance();
      messengerService.setMessageHandler(
        async (message: any, historyMessages?: any[], botConfig?: Record<string, any>) => {
          const msg = message as IMessage;
          const history = (historyMessages as IMessage[]) || [];
          const config = botConfig || {};

          await bus.emitAsync('message:incoming', {
            message: msg,
            history: history,
            botConfig: config,
            botName: String(config.BOT_NAME || config.name || 'hivemind'),
            platform: msg.platform || 'unknown',
            channelId: msg.getChannelId?.() || '',
            metadata: {},
          });
          return ''; // Response is sent by SendStage
        }
      );
    } else {
      // Legacy mode: call handleMessage() directly
      messengerService.setMessageHandler((...args: any[]) =>
        messageHandlerModule.handleMessage(args[0], args[1], args[2])
      );
    }
    indexLog('[DEBUG] Message handler set up successfully.');

    // Operator-friendly startup summary (INFO-level).
    // By default we only log a preview of the system prompt to avoid accidental leakage; set
    // STARTUP_LOG_SYSTEM_PROMPT=full to print it verbatim.
    try {
      const mode = String(process.env.STARTUP_LOG_SYSTEM_PROMPT || 'preview').toLowerCase();
      const maxPreview = Number(process.env.STARTUP_LOG_SYSTEM_PROMPT_PREVIEW_CHARS || 280);
      const summaries =
        typeof messengerService.getAgentStartupSummaries === 'function'
          ? messengerService.getAgentStartupSummaries()
          : [];

      const renderPrompt = (p: string | undefined) => {
        const text = String(p || '').trim();
        if (!text) {
          return { systemPromptMode: 'off', systemPromptPreview: '', systemPromptLength: 0 };
        }
        if (mode === 'off') {
          return {
            systemPromptMode: 'off',
            systemPromptPreview: '',
            systemPromptLength: text.length,
          };
        }
        if (mode === 'full') {
          return { systemPromptMode: 'full', systemPrompt: text, systemPromptLength: text.length };
        }
        const preview = text.length > maxPreview ? `${text.slice(0, maxPreview)}\u2026` : text;
        return {
          systemPromptMode: 'preview',
          systemPromptPreview: preview,
          systemPromptLength: text.length,
        };
      };

      for (const s of summaries) {
        const promptInfo = renderPrompt(s.systemPrompt);
        appLogger.info('\ud83e\udd16 Bot instance', {
          name: s.name,
          provider: s.provider,
          botId: s.botId,
          messageProvider: s.messageProvider,
          llmProvider: s.llmProvider,
          llmModel: s.llmModel,
          llmEndpoint: s.llmEndpoint,
          ...promptInfo,
        });
      }
    } catch (e) {
      appLogger.warn('Failed to log bot startup summaries', {
        error: e instanceof Error ? e.message : String(e),
      });
    }

    // Log successful provider initialization
    startupDiagnostics.logProviderInitialized(providerType, {
      providerName: messengerService.providerName,
      hasDefaultChannel: !!messengerService.getDefaultChannel?.(),
      channelCount: messengerService.getChannels?.()?.length || 0,
    });

    // Send Welcome Message if enabled
    const enableWelcome = process.env.ENABLE_WELCOME_MESSAGE === 'true';
    if (enableWelcome) {
      const defaultChannel = messengerService.getDefaultChannel
        ? messengerService.getDefaultChannel()
        : null;
      if (defaultChannel) {
        const welcomeText =
          process.env.WELCOME_MESSAGE_TEXT ||
          '\ud83e\udd16 System Online: I am now connected and ready to assist.';
        appLogger.info('Sending welcome message', { channel: defaultChannel, text: welcomeText });

        try {
          if (messengerService.sendMessageToChannel) {
            await messengerService.sendMessageToChannel(defaultChannel, welcomeText);
          } else if (messengerService.sendMessage) {
            await messengerService.sendMessage(defaultChannel, welcomeText);
          }
        } catch (err) {
          appLogger.warn('Failed to send welcome message', { error: err });
        }
      }
    }
  } catch (error) {
    indexLog('[ERROR] Error starting bot service:', error);

    // Log provider initialization failure with diagnostics
    startupDiagnostics.logProviderInitializationFailed(providerType, error);

    // Log the error but don't exit the process - we want other bots to continue working
    appLogger.error('Bot initialization failed', { error, providerType });
  }
}

export interface InitServicesResult {
  messengerServices: any[];
}

/**
 * Initialize all backend services: DI, database, providers, messengers, pipeline, etc.
 * Returns the messenger services array so the caller can pass it to HTTP/webhook setup.
 */
export async function initServices(
  app: import('express').Application
): Promise<InitServicesResult> {
  const shutdownCoordinator = ShutdownCoordinator.getInstance();

  registerServices();

  // Initialize database connection
  try {
    const { DatabaseManager } = await import('../database/DatabaseManager');
    const dbManager = DatabaseManager.getInstance();
    const dbPath = process.env.DATABASE_PATH || 'data/hivemind.db';
    dbManager.configure({ type: 'sqlite', path: dbPath });
    await dbManager.connect();
    appLogger.info('Database connected', { path: dbPath });
  } catch (error) {
    appLogger.warn('Database initialization failed (persistence features disabled)', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Validate critical environment variables before proceeding
  validateRequiredEnvVars();

  // Application startup with enhanced diagnostics
  appLogger.info('\ud83d\ude80 Starting Open Hivemind Server');

  // Load bot configurations (database-first with sync)
  try {
    const { BotConfigurationManager } = await import('@src/config/BotConfigurationManager');
    const configManager = BotConfigurationManager.getInstance();
    await configManager.loadConfiguration();
    appLogger.info('Bot configurations loaded and synced to database');
  } catch (error) {
    appLogger.warn('Failed to load bot configurations', { error });
  }

  // Initialize providers (skip in demo/skip mode)
  if (process.env.SKIP_MESSENGERS !== 'true') {
    await initProviders();
  }

  // Initialize SyncProviderRegistry for fast synchronous lookups in the hot path
  try {
    const rawMessageProviders = messageConfig.get('MESSAGE_PROVIDER') as unknown;
    const messengerTypes = (
      typeof rawMessageProviders === 'string'
        ? rawMessageProviders.split(',').map((v: string) => v.trim())
        : Array.isArray(rawMessageProviders)
          ? rawMessageProviders
          : []
    ) as string[];

    const registry = SyncProviderRegistry.getInstance();
    const initResult = await registry.initialize({
      llmProfiles: loadLlmProfiles().llm as unknown as ProviderProfile[],
      memoryProfiles: loadMemoryProfiles().memory as ProviderProfile[],
      toolProfiles: loadToolProfiles().tool as unknown as ProviderProfile[],
      messengerPlatforms: messengerTypes,
    });
    appLogger.info('Provider registry initialized', initResult.loaded);
    if (initResult.failed.length > 0) {
      appLogger.warn('Some providers failed to load in registry', {
        failed: initResult.failed,
      });
    }
  } catch (err) {
    appLogger.warn('SyncProviderRegistry initialization failed (falling back to legacy loaders)', {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // Reload global configs to include provider schemas
  await reloadGlobalConfigs();

  // Run comprehensive startup diagnostics
  await startupDiagnostics.logStartupDiagnostics();

  // Initialize Demo Mode Service
  const demoService = container.resolve(DemoModeService);
  await demoService.initialize();

  if (demoService.isInDemoMode()) {
    appLogger.info('\ud83c\udfad Demo Mode ACTIVE - No credentials configured');
    appLogger.info('\ud83c\udfad The WebUI will show demo bots and simulated responses');
    appLogger.info('\ud83c\udfad Configure API keys/tokens to enable production mode');
  } else {
    appLogger.info('\u2705 Production Mode - Credentials detected');
  }

  // Initialize the StartupGreetingService
  const startupGreetingService = container.resolve(StartupGreetingService);
  await startupGreetingService.initialize();

  // Initialize and start BotHeartbeatService (Auto-Healing)
  const heartbeatService = BotHeartbeatService.getInstance();
  heartbeatService.start();
  shutdownCoordinator.registerService({
    name: 'BotHeartbeatService',
    shutdown: () => heartbeatService.stop(),
  });

  // Initialize and start BackupSchedulerService (Automated Backups)
  const backupScheduler = BackupSchedulerService.getInstance();
  backupScheduler.start();
  shutdownCoordinator.registerService({
    name: 'BackupSchedulerService',
    shutdown: () => backupScheduler.stop(),
  });

  // Initialize and start BotTaskScheduler (Scheduled Prompts)
  const taskScheduler = BotTaskScheduler.getInstance();
  taskScheduler.start();
  shutdownCoordinator.registerService({
    name: 'BotTaskScheduler',
    shutdown: () => taskScheduler.stop(),
  });

  // Initialize and start Database Maintenance Service (Keep-Alive & Cleanup)
  const maintenanceService = DatabaseMaintenanceService.getInstance();
  maintenanceService.start();
  shutdownCoordinator.registerService({
    name: 'DatabaseMaintenanceService',
    shutdown: () => maintenanceService.stop(),
  });

  // Initialize AnomalyDetectionService
  AnomalyDetectionService.getInstance();
  appLogger.info('\ud83d\udd0d Anomaly Detection Service initialized');

  // Prepare messenger services collection for optional webhook registration later
  let messengerServices: any[] = [];

  // In demo mode, skip messenger initialization if no real providers configured
  const shouldSkipMessengers = skipMessengers || demoService.isInDemoMode();

  let llmProviders: any[] = [];
  if (!shouldSkipMessengers) {
    llmProviders = await getLlmProvider();
    appLogger.info('\ud83e\udd16 Resolved LLM providers', {
      providers: llmProviders.map((p) => p.constructor?.name || 'Unknown'),
    });
  } else {
    appLogger.info('\ud83e\udd16 LLM provider resolution skipped (demo/skip mode)');
  }

  if (shouldSkipMessengers) {
    if (demoService.isInDemoMode()) {
      appLogger.info('\ud83c\udfad Skipping messenger initialization - Demo Mode active');
    } else {
      appLogger.info('\ud83e\udd16 Skipping messenger initialization due to SKIP_MESSENGERS=true');
    }
  } else {
    appLogger.info('\ud83d\udce1 Initializing messenger services');
    const rawMessageProviders = messageConfig.get('MESSAGE_PROVIDER') as unknown;
    const messageProviders = (
      typeof rawMessageProviders === 'string'
        ? rawMessageProviders.split(',').map((v: string) => v.trim())
        : Array.isArray(rawMessageProviders)
          ? rawMessageProviders
          : ['slack']
    ) as string[];
    appLogger.info('\ud83d\udce1 Message providers configured', { providers: messageProviders });

    messengerServices = await messengerProviderModule.getMessengerProvider();
    // Only initialize messenger services that match the configured MESSAGE_PROVIDER(s)
    const filteredMessengers = messengerServices.filter((service) => {
      // If providerName is not defined, assume 'slack' by default.
      const providerName = service.providerName || 'slack';
      return messageProviders.includes(providerName.toLowerCase());
    });

    // Register messenger services with ShutdownCoordinator
    for (const service of messengerServices) {
      shutdownCoordinator.registerMessengerService(service as any);
    }

    if (filteredMessengers.length > 0) {
      appLogger.info('\ud83e\udd16 Starting messenger bots', {
        services: filteredMessengers.map((s) => s.providerName).join(', '),
      });
      const startResults = await Promise.allSettled(
        filteredMessengers.map(async (service) => {
          await startBot(app, service);
          appLogger.info('\u2705 Bot started', { provider: service.providerName });
        })
      );
      const failures = startResults.filter((r) => r.status === 'rejected');
      if (failures.length > 0) {
        appLogger.error(`Failed to start ${failures.length} messenger bot(s)`, { failures });
      }
    } else {
      appLogger.info(
        '\ud83e\udd16 No specific messenger service configured - starting all available services'
      );
      const startResults = await Promise.allSettled(
        messengerServices.map(async (service) => {
          await startBot(app, service);
          appLogger.info('\u2705 Bot started', { provider: service.providerName });
        })
      );
      const failures = startResults.filter((r) => r.status === 'rejected');
      if (failures.length > 0) {
        appLogger.error(`Failed to start ${failures.length} messenger bot(s)`, { failures });
      }
    }
  }

  // ── 5-stage message pipeline (default, disable via USE_LEGACY_HANDLER=true) ──
  if (process.env.USE_LEGACY_HANDLER !== 'true') {
    const { MessageBus } = await import('@src/events/MessageBus');
    const { createPipeline } = await import('@src/pipeline/createPipeline');

    const bus = MessageBus.getInstance();

    // Create and register a pipeline instance per messenger service.
    // createPipeline() internally creates a PipelineTracer and stores it
    // via setActiveTracer() — no need to create a second tracer here.
    for (const service of messengerServices) {
      createPipeline(bus, {
        botConfig: {},
        messengerService: service,
        botId: service.botId,
        defaultChannelId: service.getDefaultChannel?.() ?? undefined,
      });
    }

    appLogger.info('\ud83d\udd00 Pipeline mode active (set USE_LEGACY_HANDLER=true to revert)');
  }

  return { messengerServices };
}

/**
 * Register webhook routes if WEBHOOK_ENABLED is set.
 */
export async function initWebhooks(
  app: import('express').Application,
  messengerServices: MessengerService[]
): Promise<void> {
  const isWebhookEnabled = webhookConfig.get('WEBHOOK_ENABLED') || false;
  if (isWebhookEnabled) {
    const webhookServiceModule = await import('@webhook/webhookService');
    appLogger.info('\ud83e\ude9d Webhook service enabled - registering routes');
    for (const messengerService of messengerServices) {
      const channelId = messengerService.getDefaultChannel
        ? messengerService.getDefaultChannel()
        : null;
      if (channelId) {
        await webhookServiceModule.webhookService.start(app, messengerService as any, channelId);
        appLogger.info('\u2705 Webhook route registered', {
          provider: messengerService.providerName,
          channelId,
        });
      }
    }
  } else {
    appLogger.info('\ud83e\ude9d Webhook service is disabled');
  }
}
