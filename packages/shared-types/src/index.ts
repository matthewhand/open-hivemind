/**
 * @hivemind/shared-types
 *
 * Shared TypeScript interfaces and base classes for Open Hivemind adapters.
 * This package contains platform-agnostic contracts that all adapters implement.
 */

export * from './IMessage';
export * from './IMessengerService';
export * from './IErrorTypes';
export * from './ILlmProvider';
export * from './IBotConfig';
export * from './IServiceDependencies';
export * from './IAdapterFactory';
export {
    BaseError,
    ValidationError,
    NetworkError,
    ApiError,
    ConfigurationError,
    defaultErrorFactory,
    type IErrorFactory,
} from './errors';
