import {
  ApiError,
  BaseError,
  ConfigurationError,
  NetworkError,
  ValidationError,
  type IServiceDependencies,
} from '@hivemind/shared-types';
import Logger from '../common/logger';
import { DatabaseManager } from '../database/DatabaseManager';

/**
 * Construct IServiceDependencies from the DI container and system services.
 * Used for injecting core services into pluggable providers.
 */
export function getServiceDependencies(context: string): IServiceDependencies {
  return {
    logger: Logger.withContext(context),
    errorTypes: {
      HivemindError: BaseError as any,

      ConfigError: ConfigurationError as any,

      NetworkError: NetworkError as any,

      ValidationError: ValidationError as any,

      AuthenticationError: ApiError as any, // Map to ApiError for now
    },
    getDatabaseManager: () => DatabaseManager.getInstance(),

    getLlmProviders: () => {
      // Note: this is sync in the interface but getLlmProvider is async
      // This is a known architectural mismatch being handled via pre-loading
      // or lazy resolution.
      const { SyncProviderRegistry } = require('../registries/SyncProviderRegistry');
      const registry = SyncProviderRegistry.getInstance();

      if (registry.isInitialized()) {
        return registry.getLlmProviders();
      }
      return [];
    },

    isBotDisabled: (name: string) => {
      const { BotConfigurationManager } = require('../config/BotConfigurationManager');
      return !BotConfigurationManager.getInstance().getBotConfig(name)?.isActive;
    },
  };
}
