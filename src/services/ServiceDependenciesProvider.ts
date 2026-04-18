import {
  type IBotConfig,
  type IConfigAccessor,
  type IErrorTypes,
  type IMetricsCollector,
  type IServiceDependencies,
  type IStartupGreetingService,
  type IWebSocketService,
} from '@hivemind/shared-types';
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
      HivemindError: errorClasses.BaseHivemindError as unknown as IErrorTypes['HivemindError'],
      ConfigError: errorClasses.ConfigurationError as unknown as IErrorTypes['ConfigError'],
      NetworkError: errorClasses.NetworkError as unknown as IErrorTypes['NetworkError'],
      ValidationError: errorClasses.ValidationError as unknown as IErrorTypes['ValidationError'],
      AuthenticationError:
        errorClasses.AuthenticationError as unknown as IErrorTypes['AuthenticationError'],
    };

    return {
      logger: Logger.withContext('Adapter'),
      errorTypes,
      discordConfig: (discordConfig.default || discordConfig) as unknown as IConfigAccessor,
      slackConfig: (slackConfig.default || slackConfig) as unknown as IConfigAccessor,
      messageConfig: (messageConfig.default || messageConfig) as unknown as IConfigAccessor,
      webSocketService: WebSocketService.getInstance() as unknown as IWebSocketService,
      metricsCollector: MetricsCollector.getInstance() as unknown as IMetricsCollector,
      startupGreetingService: container.resolve(
        StartupGreetingService
      ) as unknown as IStartupGreetingService,
      getBotConfig: (name: string) => botConfigManager.getBot(name) as unknown as IBotConfig | null,
      getAllBotConfigs: () => botConfigManager.getAllBots() as unknown as IBotConfig[],
      isBotDisabled: (name: string) => !botConfigManager.getBot(name)?.enabled,
    };
  }
}
