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
  logger.debug('Registering ConfigurationManager');
  container.register(TOKENS.ConfigurationManager, {
    useValue: ConfigurationManager.getInstance(),
  });

  logger.debug('Registering BotConfigurationManager instance');
  container.register(TOKENS.BotConfigurationManager, {
    useValue: BotConfigurationManager.getInstance(),
  });

  logger.debug('Registering UserConfigStore');
  container.register(TOKENS.UserConfigStore, {
    useValue: UserConfigStore.getInstance(),
  });

  logger.debug('Registering SecureConfigManager');
  container.register(TOKENS.SecureConfigManager, {
    useValue: SecureConfigManager.getInstance(),
  });

  logger.warn('BotConfigurationManager is being registered a second time (useClass); this will override the useValue registration above');
  container.register(
    TOKENS.BotConfigurationManager,
    {
      useClass: BotConfigurationManager,
    },
    { lifecycle: Lifecycle.Singleton }
  );

  logger.warn('UserConfigStore is being registered a second time; this will override the first registration');
  container.register(TOKENS.UserConfigStore, {
    useValue: UserConfigStore.getInstance(),
  });

  logger.debug('Registering ProviderConfigManager');
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
