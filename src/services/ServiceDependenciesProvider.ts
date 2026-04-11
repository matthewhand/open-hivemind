import { type IErrorTypes, type IServiceDependencies } from '@hivemind/shared-types';
import Logger from '../common/logger';
import { BotConfigurationManager } from '../config/BotConfigurationManager';
import * as discordConfig from '../config/discordConfig';
import * as messageConfig from '../config/messageConfig';
import * as slackConfig from '../config/slackConfig';
import { container } from '../di/container';
import { MetricsCollector } from '../monitoring/MetricsCollector';
import { WebSocketService } from '../server/services/WebSocketService';
import * as errorClasses from '../types/errorClasses';
import { StartupGreetingService } from './StartupGreetingService';

/**
 * Provides service dependencies for adapter packages.
 * This class bridges the main application's DI container and services
 * with the expectations of the adapter interfaces.
 */
export class ServiceDependenciesProvider {
  /**
   * Get the standard service dependencies object.
   */
  public static getDependencies(): IServiceDependencies {
    const botConfigManager = BotConfigurationManager.getInstance();

    const errorTypes: IErrorTypes = {
      HivemindError: errorClasses.BaseHivemindError as any,
      ConfigError: errorClasses.ConfigurationError as any,
      NetworkError: errorClasses.NetworkError as any,
      ValidationError: errorClasses.ValidationError as any,
      AuthenticationError: errorClasses.AuthenticationError as any,
    };

    return {
      logger: Logger.withContext('Adapter'),
      errorTypes,
      discordConfig: (discordConfig.default || discordConfig) as any,
      slackConfig: (slackConfig.default || slackConfig) as any,
      messageConfig: (messageConfig.default || messageConfig) as any,
      webSocketService: WebSocketService.getInstance() as any,
      metricsCollector: MetricsCollector.getInstance() as any,
      startupGreetingService: container.resolve(StartupGreetingService) as any,
      getBotConfig: (name: string) => botConfigManager.getBot(name) as any,
      getAllBotConfigs: () => botConfigManager.getAllBots() as any,
      isBotDisabled: (name: string) => !botConfigManager.getBot(name)?.enabled,
    };
  }
}
