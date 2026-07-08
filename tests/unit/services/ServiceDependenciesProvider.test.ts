import { BotConfigurationManager } from '../../../src/config/BotConfigurationManager';
import { MetricsCollector } from '../../../src/monitoring/MetricsCollector';
import { WebSocketService } from '../../../src/server/services/WebSocketService';
import { ServiceDependenciesProvider } from '../../../src/services/ServiceDependenciesProvider';
import { StartupGreetingService } from '../../../src/services/StartupGreetingService';

jest.mock('../../../src/config/BotConfigurationManager');
jest.mock('../../../src/server/services/WebSocketService');
jest.mock('../../../src/monitoring/MetricsCollector');
jest.mock('../../../src/services/StartupGreetingService');
jest.mock('../../../src/di/container', () => ({
  container: {
    resolve: jest.fn().mockReturnValue({}),
  },
}));

describe('ServiceDependenciesProvider', () => {
  beforeEach(() => {
    (BotConfigurationManager.getInstance as jest.Mock).mockReturnValue({
      getBot: jest.fn(),
      getAllBots: jest.fn(),
    });
    (WebSocketService.getInstance as jest.Mock).mockReturnValue({});
    (MetricsCollector.getInstance as jest.Mock).mockReturnValue({});
  });

  it('should return dependencies object with required properties', () => {
    const deps = ServiceDependenciesProvider.getDependencies();

    expect(deps).toBeDefined();
    expect(deps.logger).toBeDefined();
    expect(deps.errorTypes).toBeDefined();
    expect(deps.webSocketService).toBeDefined();
    expect(deps.metricsCollector).toBeDefined();
    expect(deps.getBotConfig).toBeInstanceOf(Function);
  });
});
