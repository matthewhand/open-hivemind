/**
 * Service Registration
 *
 * This module registers all application services with the DI container.
 * Import this file at application startup to initialize the container.
 */

import 'reflect-metadata';
import { container, Lifecycle } from 'tsyringe';
import Logger from '../common/logger';
import { BotConfigurationManager } from '../config/BotConfigurationManager';
// Import implementations
import { ConfigurationManager } from '../config/ConfigurationManager';
import ProviderConfigManager from '../config/ProviderConfigManager';
import { SecureConfigManager } from '../config/SecureConfigManager';
import { UserConfigStore } from '../config/UserConfigStore';
import { TOKENS } from './container';

const logger = Logger.withContext('DI');

/**
 * Registers all core services with the DI container.
 * Should be called once at application startup.
 */
export function registerServices(): void {
  // Configuration services - singletons
  container.register(TOKENS.ConfigurationManager, {
    useValue: ConfigurationManager.getInstance(),
  });

  container.register(TOKENS.BotConfigurationManager, {
    useValue: BotConfigurationManager.getInstance(),
  });

  container.register(TOKENS.UserConfigStore, {
    useValue: UserConfigStore.getInstance(),
  });

  container.register(
    TOKENS.SecureConfigManager,
    {
      useValue: SecureConfigManager.getInstance(),
    }
  );

  container.register(
    TOKENS.BotConfigurationManager,
    {
      useClass: BotConfigurationManager,
    },
    { lifecycle: Lifecycle.Singleton }
  );

  container.register(TOKENS.UserConfigStore, {
    useValue: UserConfigStore.getInstance(),
  });

  container.register(TOKENS.ProviderConfigManager, {
    useValue: ProviderConfigManager.getInstance(),
  });

  logger.info('✅ DI services registered');
}

/**
 * Checks if services are already registered
 */
export function areServicesRegistered(): boolean {
  return container.isRegistered(TOKENS.ConfigurationManager);
}

export { container, TOKENS };
