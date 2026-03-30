/**
 * Service Registration
 *
 * This module registers all application services with the DI container.
 * Import this file at application startup to initialize the container.
 */

import 'reflect-metadata';
import { Lifecycle } from 'tsyringe';
import Logger from '../common/logger';
import { BotConfigurationManager } from '../config/BotConfigurationManager';
// Import implementations
import { ConfigurationManager } from '../config/ConfigurationManager';
import { MCPProviderManager } from '../config/MCPProviderManager';
import ProviderConfigManager from '../config/ProviderConfigManager';
import { SecureConfigManager } from '../config/SecureConfigManager';
import { UserConfigStore } from '../config/UserConfigStore';
import { DatabaseManager } from '../database/DatabaseManager';
import { SchemaManager } from '../database/SchemaManager';
import { BotManager } from '../managers/BotManager';
import { RealTimeValidationService } from '../server/services/RealTimeValidationService';
import { WebSocketService } from '../server/services/WebSocketService';
import { container, TOKENS } from './container';

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

  logger.debug('Registering ProviderConfigManager');
  container.register(TOKENS.ProviderConfigManager, {
    useValue: ProviderConfigManager.getInstance(),
  });

  logger.debug('Registering DatabaseManager');
  container.registerSingleton(TOKENS.DatabaseManager, DatabaseManager);

  logger.debug('Registering SchemaManager');
  container.registerSingleton(TOKENS.SchemaManager, SchemaManager);

  logger.debug('Registering BotManager');
  container.registerSingleton(TOKENS.BotManager, BotManager);

  logger.debug('Registering MCPProviderManager');
  container.registerSingleton('MCPProviderManager', MCPProviderManager);

  logger.debug('Registering WebSocketService');
  container.registerSingleton(TOKENS.WebSocketService, WebSocketService);

  logger.debug('Registering RealTimeValidationService');
  container.registerSingleton(TOKENS.RealTimeValidationService, RealTimeValidationService);

  logger.info('✅ DI services registered');
}

/**
 * Checks if services are already registered
 */
export function areServicesRegistered(): boolean {
  return container.isRegistered(TOKENS.ConfigurationManager);
}

/**
 * Validates all registrations by attempting to resolve them.
 * Logs failures.
 */
export function validateRegistrations(): void {
  const tokensToValidate = [
    TOKENS.ConfigurationManager,
    TOKENS.BotConfigurationManager,
    TOKENS.UserConfigStore,
    TOKENS.SecureConfigManager,
    TOKENS.ProviderConfigManager,
    TOKENS.DatabaseManager,
    TOKENS.SchemaManager,
    TOKENS.BotManager,
    'MCPProviderManager',
    TOKENS.WebSocketService,
    TOKENS.RealTimeValidationService,
  ];

  let hasErrors = false;
  for (const token of tokensToValidate) {
    try {
      container.resolve(token);
    } catch (error) {
      logger.error(`Failed to resolve DI token: ${String(token)}`, error);
      hasErrors = true;
    }
  }

  if (hasErrors) {
    logger.error('❌ DI validation failed. Some services could not be resolved.');
  } else {
    logger.info('✅ DI validation passed');
  }
}

export { container, TOKENS };
