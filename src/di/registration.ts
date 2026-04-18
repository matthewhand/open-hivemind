/**
 * Service Registration
 *
 * This module registers all application services with the DI container.
 * Import this file at application startup to initialize the container.
 */

import 'reflect-metadata';
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
import { BotConfigService } from '../server/services/BotConfigService';
import { ConfigurationTemplateService } from '../server/services/ConfigurationTemplateService';
import { ConfigurationValidator } from '../server/services/ConfigurationValidator';
import { RealTimeValidationService } from '../server/services/RealTimeValidationService';
import { BroadcastService } from '../server/services/websocket/BroadcastService';
import { ConnectionManager } from '../server/services/websocket/ConnectionManager';
import { EventHandlers } from '../server/services/websocket/EventHandlers';
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
  const providerConfigManager = ProviderConfigManager.getInstance();
  container.register(TOKENS.ProviderConfigManager, {
    useValue: providerConfigManager,
  });

  // Reload BotConfigurationManager in case it was instantiated before dotenv loaded,
  // then sync BOTS_* env-configured providers into ProviderConfigManager.
  BotConfigurationManager.getInstance().reload();
  providerConfigManager.syncBotProviders();

  logger.debug('Registering DatabaseManager');
  container.registerInstance(TOKENS.DatabaseManager, DatabaseManager.getInstance());
  container.registerInstance(DatabaseManager, DatabaseManager.getInstance());

  logger.debug('Registering SchemaManager');
  container.registerSingleton(TOKENS.SchemaManager, SchemaManager);

  logger.debug('Registering BotManager');
  container.registerSingleton(TOKENS.BotManager, BotManager);

  logger.debug('Registering MCPProviderManager');
  container.registerSingleton('MCPProviderManager', MCPProviderManager);

  logger.debug('Registering WebSocketService dependencies');
  container.registerSingleton(ConnectionManager, ConnectionManager);
  container.registerSingleton(BroadcastService, BroadcastService);
  container.registerSingleton(EventHandlers, EventHandlers);

  logger.debug('Registering WebSocketService');
  container.registerSingleton(TOKENS.WebSocketService, WebSocketService);

  logger.debug('Registering RealTimeValidationService');
  container.registerSingleton(TOKENS.RealTimeValidationService, RealTimeValidationService);

  logger.debug('Registering Configuration services');
  container.registerSingleton(ConfigurationValidator, ConfigurationValidator);
  container.registerSingleton(BotConfigService, BotConfigService);
  container.registerSingleton(ConfigurationTemplateService, ConfigurationTemplateService);

  logger.debug('Registering DemoModeService');
  const { default: DemoModeServiceClass } = require('../services/DemoModeService');
  container.registerSingleton('DemoModeService', DemoModeServiceClass);

  logger.debug('Registering GreetingStateManager');
  const { GreetingStateManager: GreetingStateManagerClass } = require('../services/GreetingStateManager');
  container.registerSingleton(GreetingStateManagerClass, GreetingStateManagerClass);

  logger.debug('Registering StartupGreetingService');
  const { StartupGreetingService: StartupGreetingServiceClass } = require('../services/StartupGreetingService');
  container.registerSingleton(StartupGreetingServiceClass, StartupGreetingServiceClass);
  container.registerSingleton('StartupGreetingService', StartupGreetingServiceClass);

  logger.debug('Registering SwarmCoordinator');
  const { SwarmCoordinator: SwarmCoordinatorClass } = require('../services/SwarmCoordinator');
  // SwarmCoordinator uses singleton pattern with private constructor
  // Register the instance directly instead of the class
  container.registerInstance(TOKENS.SwarmCoordinator, SwarmCoordinatorClass.getInstance());
  container.registerInstance(SwarmCoordinatorClass, SwarmCoordinatorClass.getInstance());

  logger.info('DI services registered');
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
    TOKENS.SwarmCoordinator,
    StartupGreetingService,
    'DemoModeService',
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
