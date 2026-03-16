/**
 * Dependency Injection Container Configuration
 *
 * This module configures the tsyringe DI container for the application.
 * It provides a centralized location for registering services and their dependencies.
 *
 * Usage:
 * 1. Import 'reflect-metadata' at the entry point (src/index.ts)
 * 2. Use @injectable() decorator on service classes
 * 3. Use @inject() decorator for constructor dependencies
 * 4. Register services with container.register()
 *
 * Benefits:
 * - Explicit dependency declaration
 * - Easier testing with mock injection
 * - Decoupled components
 * - Single source of truth for service lifecycle
 */

import 'reflect-metadata';
import { container, Lifecycle } from 'tsyringe';

// Token constants for interface-based injections
export const TOKENS = {
  // Configuration
  ConfigurationManager: 'ConfigurationManager',
  BotConfigurationManager: 'BotConfigurationManager',
  SecureConfigManager: 'SecureConfigManager',
  UserConfigStore: 'UserConfigStore',
  ProviderConfigManager: 'ProviderConfigManager',
  HotReloadManager: 'HotReloadManager',

  // Core Services
  BotManager: 'BotManager',
  PersonaManager: 'PersonaManager',
  MCPService: 'MCPService',
  MCPGuard: 'MCPGuard',

  // Database
  DatabaseManager: 'DatabaseManager',
  ConnectionManager: 'ConnectionManager',
  MigrationManager: 'MigrationManager',
  SchemaManager: 'SchemaManager',

  // Server Services
  WebSocketService: 'WebSocketService',
  ShutdownCoordinator: 'ShutdownCoordinator',
  BotConfigService: 'BotConfigService',
  ConfigurationValidator: 'ConfigurationValidator',
  ConfigurationVersionService: 'ConfigurationVersionService',
  ConfigurationTemplateService: 'ConfigurationTemplateService',
  ConfigurationImportExportService: 'ConfigurationImportExportService',
  RealTimeNotificationService: 'RealTimeNotificationService',
  RealTimeValidationService: 'RealTimeValidationService',

  // Auth
  AuthManager: 'AuthManager',
  SessionManager: 'SessionManager',

  // Monitoring
  AdvancedMonitor: 'AdvancedMonitor',
  HealthChecker: 'HealthChecker',
  MetricsCollector: 'MetricsCollector',
  AlertManager: 'AlertManager',
  MonitoringService: 'MonitoringService',
  ApiMonitorService: 'ApiMonitorService',

  // Message Processing
  IdleResponseManager: 'IdleResponseManager',
  ChannelRouter: 'ChannelRouter',

  // Utilities
  AuditLogger: 'AuditLogger',
  PerformanceProfiler: 'PerformanceProfiler',
  TimerRegistry: 'TimerRegistry',
  StartupDiagnostics: 'StartupDiagnostics',

  // Integration Services
  SlackService: 'SlackService',
  MattermostService: 'MattermostService',
} as const;

/**
 * Clears all registered services - useful for testing
 */
export function resetContainer(): void {
  container.reset();
}

/**
 * Register a singleton service
 * @param token The token/key for the service
 * @param klass The class constructor
 */
export function registerSingleton<T>(token: string, klass: new (...args: any[]) => T): void {
  container.register(token, { useClass: klass }, { lifecycle: Lifecycle.Singleton });
}

/**
 * Register a transient service (new instance each time)
 * @param token The token/key for the service
 * @param klass The class constructor
 */
export function registerTransient<T>(token: string, klass: new (...args: any[]) => T): void {
  container.register(token, { useClass: klass });
}

/**
 * Register an instance (useful for mocks in tests)
 * @param token The token/key for the service
 * @param instance The instance to register
 */
export function registerInstance<T>(token: string, instance: T): void {
  container.registerInstance(token, instance);
}

/**
 * Resolve a service from the container
 * @param token The token/key for the service
 * @returns The service instance
 */
export function resolve<T>(token: string): T {
  return container.resolve(token);
}

/**
 * Check if a token is registered
 * @param token The token/key to check
 * @returns true if registered
 */
export function isRegistered(token: string): boolean {
  return container.isRegistered(token);
}

export { container };
