import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IntegrationLoader } from '../IntegrationLoader';
import logger from '../../utils/logger';

// Mock the logger
vi.mock('../../utils/logger', () => ({
  default: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    log: vi.fn(),
  },
}));

describe('IntegrationLoader', () => {
  let loader: IntegrationLoader;

  beforeEach(() => {
    vi.clearAllMocks();
    loader = IntegrationLoader.getInstance();
    // @ts-ignore - access private member for testing
    loader.manifestCache.clear();
    // @ts-ignore - access private member for testing
    loader.loadedIntegrations.clear();
  });

  it('should continue loading components when one fails in auto-discovery', async () => {
    const integrationId = 'test-integration';

    // Mock loadComponent to succeed for one and fail for others
    const loadComponentSpy = vi.spyOn(loader as any, 'loadComponent');

    loadComponentSpy.mockImplementation(async (_id, path) => {
      if (path === 'ui/Dashboard') {
        return (() => null) as any; // Mock component
      }
      throw new Error('Component not found');
    });

    // @ts-ignore - access private member
    const components = await loader.autoDiscoverComponents(integrationId);

    // Should have found the Dashboard component
    expect(components.length).toBe(1);
    expect(components[0].id).toBe('test-integration.Dashboard');

    // Should have logged debug messages for failed components
    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('ui/Configuration not found'));
    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('Settings not found'));
  });
});
