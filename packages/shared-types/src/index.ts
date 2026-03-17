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
export {
  BaseError,
  ValidationError,
  NetworkError,
  ApiError,
  ConfigurationError,
  defaultErrorFactory,
  type IErrorFactory,
} from './errors';
<<<<<<< HEAD
<<<<<<< HEAD
export { isSafeUrl } from './ssrfGuard';
export { getRandomDelay } from './getRandomDelay';
=======
>>>>>>> origin/jules-responsive-layout-consistency-5760872167389438897
=======
>>>>>>> origin/refiner-database-migration-reversibility-3845862468620237629
