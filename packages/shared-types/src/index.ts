/**
 * @hivemind/shared-types
 *
 * Shared TypeScript interfaces and base classes for Open Hivemind adapters.
 * This package contains platform-agnostic contracts that all adapters implement.
 */

export { IMessage } from './IMessage';
export type { IMessengerService } from './IMessengerService';
export type {
  IServiceDependencies,
  IErrorTypes,
  IErrorRecoveryStrategy,
  IBaseError,
  INetworkErrorConstructor,
  IConfigErrorConstructor,
  IValidationErrorConstructor,
  IAuthErrorConstructor,
  IWebSocketService,
  IMetricsCollector,
  IChannelRouter,
  ILogger,
  IStartupGreetingService,
  IConfigAccessor,
  IBotConfig,
  GetBotConfigFn,
  GetAllBotConfigsFn,
  GetLlmProvidersFn,
} from './IServiceDependencies';
export type { IAdapterFactory, IAdapterConfig, IAdapterModule } from './IAdapterFactory';
export type { ILlmProvider } from './ILlmProvider';
export type {
  IMemoryProvider,
  MemoryEntry,
  MemorySearchResult,
  MemoryScopeOptions,
} from './IMemoryProvider';
export type {
  IToolProvider,
  ToolDefinition,
  ToolInputSchema,
  ToolResult,
  ToolExecutionContext,
} from './IToolProvider';
export {
  BaseError,
  ValidationError,
  NetworkError,
  ApiError,
  ConfigurationError,
  defaultErrorFactory,
  type IErrorFactory,
} from './errors';
export { isSafeUrl, isPrivateIP } from './ssrfGuard';
export { http, createHttpClient, HttpError, isHttpError } from './httpClient';
export type { RequestOptions, HttpClientInstance } from './httpClient';
