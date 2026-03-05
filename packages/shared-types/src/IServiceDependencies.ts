import type { ILlmProvider } from './ILlmProvider';
import type { IMessage } from './IMessage';

/**
 * Base error recovery strategy interface
 */
export interface IErrorRecoveryStrategy {
  canRecover: boolean;
  retryDelay?: number;
  maxRetries?: number;
  fallbackAction?: () => Promise<unknown>;
  recoverySteps?: string[];
}

/**
 * Base error interface that all error types implement
 */
export interface IBaseError extends Error {
  code: string;
  type: string;
  statusCode?: number;
  details?: Record<string, unknown>;
  retryable: boolean;
  severity: string;
  timestamp: Date;
  correlationId: string;
  context?: Record<string, unknown>;
  getRecoveryStrategy(): IErrorRecoveryStrategy;
  toJSON(): Record<string, unknown>;
}

/**
 * Network error constructor interface
 */
export interface INetworkErrorConstructor {
  new (
    message: string,
    response?: {
      data?: unknown;
      headers?: Record<string, string>;
      status?: number;
    },
    request?: {
      url?: string;
      method?: string;
      headers?: Record<string, string>;
    },
    context?: Record<string, unknown>
  ): IBaseError;
  (message: string, response?: unknown, request?: unknown, context?: unknown): IBaseError;
  prototype: Error;
}

/**
 * Configuration error constructor interface
 */
export interface IConfigErrorConstructor {
  new (
    message: string,
    configKey?: string,
    expectedType?: string,
    providedType?: string,
    context?: Record<string, unknown>
  ): IBaseError;
  (
    message: string,
    configKey?: string,
    expectedType?: string,
    providedType?: string,
    context?: unknown
  ): IBaseError;
  prototype: Error;
}

/**
 * Validation error constructor interface
 */
export interface IValidationErrorConstructor {
  new (
    message: string,
    details?: Record<string, unknown> | string,
    value?: unknown,
    expected?: unknown,
    suggestions?: string[],
    context?: Record<string, unknown>
  ): IBaseError;
  (
    message: string,
    details?: unknown,
    value?: unknown,
    expected?: unknown,
    suggestions?: unknown,
    context?: unknown
  ): IBaseError;
  prototype: Error;
}

/**
 * Authentication error constructor interface
 */
export interface IAuthErrorConstructor {
  new (
    message: string,
    provider?: string,
    reason?: 'invalid_credentials' | 'expired_token' | 'missing_token' | 'invalid_format',
    context?: Record<string, unknown>
  ): IBaseError;
  (message: string, provider?: string, reason?: string, context?: unknown): IBaseError;
  prototype: Error;
}

/**
 * Error type interfaces for adapter packages.
 * These match the actual error class constructors from src/types/errorClasses.ts
 */
export interface IErrorTypes {
  /** Base hivemind error class */
  HivemindError: typeof Error;
  /** Configuration error - for config-related issues */
  ConfigError: IConfigErrorConstructor;
  /** Network error - for network/API failures */
  NetworkError: INetworkErrorConstructor;
  /** Validation error - for input validation failures */
  ValidationError: IValidationErrorConstructor;
  /** Authentication error - for auth failures */
  AuthenticationError: IAuthErrorConstructor;
}

/**
 * WebSocket service interface for real-time updates.
 * Adapters call these methods to report events; the main app provides the implementation.
 */
export interface IWebSocketService {
  /** Record a message flow event for monitoring */
  recordMessageFlow: (event: {
    botName: string;
    provider: string;
    channelId: string;
    userId: string;
    messageType: 'incoming' | 'outgoing';
    contentLength: number;
    status: string;
  }) => void;
  /** Record an alert for monitoring */
  recordAlert: (alert: {
    level: string;
    title: string;
    message: string;
    botName: string;
    metadata?: Record<string, any>;
  }) => void;
  /** Broadcast an event to connected clients */
  broadcast?: (event: string, data: any) => void;
  /** Emit an event */
  emit?: (event: string, data: any) => void;
}

/**
 * Metrics collector interface for monitoring.
 */
export interface IMetricsCollector {
  increment: (metric: string, value?: number, tags?: Record<string, string>) => void;
  decrement: (metric: string, value?: number, tags?: Record<string, string>) => void;
  gauge: (metric: string, value: number, tags?: Record<string, string>) => void;
  timing: (metric: string, value: number, tags?: Record<string, string>) => void;
}

/**
 * Channel router interface for message routing.
 */
export interface IChannelRouter {
  /** Compute a score for a channel (higher = more preferred) */
  computeScore: (channelId: string, metadata?: Record<string, any>) => number;
  /** Pick the best channel from candidates */
  pickBestChannel?: (candidates: string[], metadata?: Record<string, any>) => string | null;
  /** Route a message */
  routeMessage?: (message: IMessage) => Promise<void>;
}

/**
 * Logger interface for adapters.
 */
export interface ILogger {
  info: (message: string, ...args: any[]) => void;
  warn: (message: string, ...args: any[]) => void;
  error: (message: string, ...args: any[]) => void;
  debug: (message: string, ...args: any[]) => void;
}

/**
 * Startup greeting service interface.
 * Used to emit service-ready events.
 */
export interface IStartupGreetingService {
  emit: (event: string, service: any) => void;
}

/**
 * Configuration access interface.
 * Provides typed access to configuration values.
 */
export interface IConfigAccessor {
  /** Get a configuration value by key */
  get: (key: string) => any;
  /** Check if a config key exists */
  has: (key: string) => boolean;
}

/**
 * Bot configuration interface for adapters.
 * Contains only the fields adapters need to know about.
 */
export interface IBotConfig {
  name: string;
  messageProvider: string;
  llmProvider?: string;
  discordBotToken?: string;
  slackBotToken?: string;
  slackAppToken?: string;
  slackSigningSecret?: string;
  mattermostUrl?: string;
  mattermostToken?: string;
  mattermostTeam?: string;
  wakeword?: string;
  personality?: string;
  persona?: string;
  idleResponseEnabled?: boolean;
  idleResponseIntervalMs?: number;
  idleResponseMessage?: string;
  /** Discord-specific config */
  discord?: {
    token?: string;
    clientId?: string;
    defaultChannelId?: string;
  };
  /** Slack-specific config */
  slack?: {
    botToken?: string;
    signingSecret?: string;
    appToken?: string;
    defaultChannelId?: string;
    joinChannels?: string;
    mode?: 'socket' | 'rtm';
  };
  /** Mattermost-specific config */
  mattermost?: {
    serverUrl?: string;
    token?: string;
    channel?: string;
    userId?: string;
    username?: string;
  };
  /** LLM config */
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
  OPENAI_BASE_URL?: string;
  SYSTEM_INSTRUCTION?: string;
  /** Raw config access for platform-specific fields */
  [key: string]: any;
}

/**
 * Function type for getting bot configuration.
 */
export type GetBotConfigFn = (botName: string) => IBotConfig | null;

/**
 * Function type for getting all bot configurations.
 */
export type GetAllBotConfigsFn = () => IBotConfig[];

/**
 * Function type for getting LLM providers.
 */
export type GetLlmProvidersFn = () => ILlmProvider[];

/**
 * Container for all dependencies that need to be injected into adapters.
 * This allows adapters to be completely decoupled from the main application.
 */
export interface IServiceDependencies {
  /** Logger instance */
  logger: ILogger;
  /** Error types for creating consistent errors */
  errorTypes: IErrorTypes;
  /** Discord-specific configuration accessor */
  discordConfig?: IConfigAccessor;
  /** Slack-specific configuration accessor */
  slackConfig?: IConfigAccessor;
  /** Message configuration accessor */
  messageConfig?: IConfigAccessor;
  /** WebSocket service for real-time updates (optional - adapter works without it) */
  webSocketService?: IWebSocketService;
  /** Metrics collector for monitoring (optional) */
  metricsCollector?: IMetricsCollector;
  /** Channel router for message routing (optional) */
  channelRouter?: IChannelRouter;
  /** Startup greeting service for emitting ready events (optional) */
  startupGreetingService?: IStartupGreetingService;
  /** Function to get bot configuration by name */
  getBotConfig?: GetBotConfigFn;
  /** Function to get all bot configurations */
  getAllBotConfigs?: GetAllBotConfigsFn;
  /** Function to get LLM providers */
  getLlmProviders?: GetLlmProvidersFn;
  /** Check if a bot is disabled */
  isBotDisabled?: (botName: string) => boolean;
}
