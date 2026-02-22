import { container, Lifecycle } from 'tsyringe';
import { BotConfigurationManager } from '../config/BotConfigurationManager';
// Import implementations
import { ConfigurationManager } from '../config/ConfigurationManager';
import ProviderConfigManager from '../config/ProviderConfigManager';
import { SecureConfigManager } from '../config/SecureConfigManager';
import { UserConfigStore } from '../config/UserConfigStore';
import { TOKENS } from './container';

/**
 * Registers all application services in the dependency injection container.
 * This should be called once at application startup.
 */
export function registerServices(): void {
  // Config Management
  container.register(
    TOKENS.ConfigurationManager,
    {
      useValue: ConfigurationManager.getInstance(),
    }
  );

  container.register(
    TOKENS.BotConfigurationManager,
    {
      useValue: BotConfigurationManager.getInstance(),
    }
  );

  container.register(
    TOKENS.UserConfigStore,
    {
      useClass: UserConfigStore,
    },
    { lifecycle: Lifecycle.Singleton }
  );

  container.register(
    TOKENS.ProviderConfigManager,
    {
      useFactory: (_) => ProviderConfigManager.getInstance(),
    }
  );

  container.register(
    TOKENS.SecureConfigManager,
    {
      useValue: SecureConfigManager.getInstance(),
    }
  );

  // Note: Specialized services like MCPService and Messenger providers 
  // are often registered separately or initialized on demand.
}
