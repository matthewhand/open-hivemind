import { apiService } from '../../../src/client/src/services/api';
import { jest } from '@jest/globals';

interface MockResponse extends Response {
  json: jest.MockedFunction<() => Promise<any>>;
}

const createMockResponse = (ok: boolean, data: any, statusText = 'OK'): MockResponse => {
  const res: MockResponse = {
    ok,
    status: ok ? 200 : 404,
    statusText,
    json: jest.fn().mockResolvedValue(data),
    text: jest.fn().mockResolvedValue(JSON.stringify(data)),
    headers: new Headers(),
    ok: ok,
    redirected: false,
    status: ok ? 200 : 404,
    statusText,
    type: 'basic',
    url: '',
    clone: jest.fn(),
    body: null,
    bodyUsed: false,
    arrayBuffer: jest.fn(),
    blob: jest.fn(),
    formData: jest.fn(),
    json: jest.fn().mockResolvedValue(data)
  } as MockResponse;
  return res;
};

describe('API Service URL Handling', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  const testCases = [
    {
      description: 'uses relative URLs when VITE_API_BASE_URL is empty',
      env: { VITE_API_BASE_URL: '' },
      expectedUrl: '/webui/api/config',
    },
    {
      description: 'uses absolute URLs when VITE_API_BASE_URL is set',
      env: { VITE_API_BASE_URL: 'https://api.example.com' },
      expectedUrl: 'https://api.example.com/webui/api/config',
    },
    {
      description: 'strips trailing slash from VITE_API_BASE_URL',
      env: { VITE_API_BASE_URL: 'https://api.example.com/' },
      expectedUrl: 'https://api.example.com/webui/api/config',
    },
    {
      description: 'handles switching to a different absolute URL',
      env: { VITE_API_BASE_URL: 'http://localhost:8080' },
      expectedUrl: 'http://localhost:8080/webui/api/config',
    },
  ];

  test.each(testCases)('getConfig $description', async ({ env, expectedUrl }) => {
    // Mock process.env instead of import.meta.env for Jest compatibility
    const originalEnv = process.env.VITE_API_BASE_URL;
    process.env.VITE_API_BASE_URL = env.VITE_API_BASE_URL;

    const mockData = { bots: [] };
    const mockFetch = jest.fn<jest.MockedFunction<typeof fetch>>().mockResolvedValue(createMockResponse(true, mockData));
    (global.fetch as jest.MockedFunction<typeof fetch>) = mockFetch;

    const { apiService: service } = await import('../../../src/client/src/services/api');

    await service.getConfig();
    expect(mockFetch).toHaveBeenCalledWith(expectedUrl, expect.any(Object));

    // Restore original env
    process.env.VITE_API_BASE_URL = originalEnv;
  });

  it('error recovery: handles invalid URL by attempting fetch', async () => {
    const originalEnv = process.env.VITE_API_BASE_URL;
    process.env.VITE_API_BASE_URL = 'invalid://url';

    const mockResponse = createMockResponse(false, {}, 'Network Error');
    const mockFetch = jest.fn<jest.MockedFunction<typeof fetch>>().mockResolvedValue(mockResponse);
    (global.fetch as jest.MockedFunction<typeof fetch>) = mockFetch;

    const { apiService: service } = await import('../../../src/client/src/services/api');

    await expect(service.getConfig()).rejects.toThrow('API request failed: Network Error');
    expect(mockFetch).toHaveBeenCalledWith('invalid://url/webui/api/config', expect.any(Object));

    // Restore original env
    process.env.VITE_API_BASE_URL = originalEnv;
  });

  it('handles API error in request', async () => {
    const mockResponse = createMockResponse(false, {}, 'Not Found');
    const mockFetch = jest.fn<jest.MockedFunction<typeof fetch>>().mockResolvedValue(mockResponse);
    (global.fetch as jest.MockedFunction<typeof fetch>) = mockFetch;

    const originalEnv = process.env.VITE_API_BASE_URL;
    process.env.VITE_API_BASE_URL = '';
    const { apiService: service } = await import('../../../src/client/src/services/api');

    await expect(service.getConfig()).rejects.toThrow('API request failed: Not Found');
    
    // Restore original env
    process.env.VITE_API_BASE_URL = originalEnv;
  });
});