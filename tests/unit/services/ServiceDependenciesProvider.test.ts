import { ServiceDependenciesProvider } from '../../../src/services/ServiceDependenciesProvider';

describe('ServiceDependenciesProvider', () => {
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
