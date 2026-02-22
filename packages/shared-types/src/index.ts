/**
 * @hivemind/shared-types
 *
 * Shared TypeScript interfaces and base classes for Open Hivemind adapters.
 * This package contains platform-agnostic contracts that all adapters implement.
 */

export { IMessage } from './IMessage';
export type { IMessengerService } from './IMessengerService';
export {
    BaseError,
    ValidationError,
    NetworkError,
    ApiError,
    ConfigurationError,
    defaultErrorFactory,
    type IErrorFactory,
} from './errors';
