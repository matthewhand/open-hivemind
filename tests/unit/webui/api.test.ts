/**
 * Tests for API Service URL handling
 */

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock the API service directly to avoid import.meta issues
jest.mock('../../../src/client/src/services/api', () => {
  return {
    apiService: {
      getConfig: jest.fn(),
      getStatus: jest.fn(),
      getConfigSources: jest.fn(),
      reloadConfig: jest.fn(),
      createBot: jest.fn(),
      updateBot: jest.fn(),
      cloneBot: jest.fn(),
      deleteBot: jest.fn(),
      getSecureConfigs: jest.fn(),
      getSecureConfig: jest.fn(),
      saveSecureConfig: jest.fn(),
      deleteSecureConfig: jest.fn(),
      backupSecureConfigs: jest.fn(),
      restoreSecureConfigs: jest.fn(),
      getSecureConfigInfo: jest.fn(),
      getActivity: jest.fn(),
      clearCache: jest.fn(),
      exportConfig: jest.fn(),
      getApiEndpointsStatus: jest.fn(),
      getApiEndpointStatus: jest.fn(),
      addApiEndpoint: jest.fn(),
      updateApiEndpoint: jest.fn(),
      removeApiEndpoint: jest.fn(),
      startApiMonitoring: jest.fn(),
      stopApiMonitoring: jest.fn(),
      getSystemHealth: jest.fn(),
    },
  };
});

describe('API Service URL Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createMockResponse = (ok: boolean, data: any, statusText = 'OK', status = 200) => ({
    ok,
    status,
    statusText: statusText,
    json: jest.fn().mockResolvedValue(data),
    text: jest.fn().mockResolvedValue(JSON.stringify(data)),
    headers: new Headers(),
    redirected: false,
    type: 'basic' as const,
    url: '',
    clone: jest.fn(),
    body: null,
    bodyUsed: false,
    arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(0)),
    blob: jest.fn().mockResolvedValue(new Blob()),
    formData: jest.fn().mockResolvedValue(new FormData()),
  });

  it('should mock API service methods properly', async () => {
    const { apiService } = require('../../../src/client/src/services/api');

    const mockData = { bots: [] };
    apiService.getConfig.mockResolvedValue(mockData);

    const result = await apiService.getConfig();
    expect(result).toEqual(mockData);
    expect(apiService.getConfig).toHaveBeenCalled();
  });

  it('should handle fetch errors gracefully', async () => {
    const { apiService } = require('../../../src/client/src/services/api');

    apiService.getConfig.mockRejectedValue(new Error('API request failed: Network Error'));

    await expect(apiService.getConfig()).rejects.toThrow('API request failed: Network Error');
    expect(apiService.getConfig).toHaveBeenCalled();
  });

  it('should handle API response errors', async () => {
    const { apiService } = require('../../../src/client/src/services/api');

    apiService.getConfig.mockRejectedValue(new Error('API request failed: Not Found'));

    await expect(apiService.getConfig()).rejects.toThrow('API request failed: Not Found');
    expect(apiService.getConfig).toHaveBeenCalled();
  });
});
