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
  IWebSocketService,
  IChannelRouter,
  ILogger,
  IConfigAccessor,
  IBotConfig,
} from './IServiceDependencies';
export type { IAdapterFactory, IAdapterConfig } from './IAdapterFactory';
export type { ILlmProvider } from './ILlmProvider';
export { isSafeUrl } from './ssrfGuard';
