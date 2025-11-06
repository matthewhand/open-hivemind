/**
 * Tests for API Service URL handling
 */

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock import.meta.env
const importMetaEnv = {
  VITE_API_BASE_URL: ''
};

// Set up import.meta properly for Jest
Object.defineProperty(global, 'import', {
  value: {
    meta: {
      env: importMetaEnv
    }
  },
  writable: true,
  configurable: true
});

describe('API Service URL Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset import.meta.env to default
    (global.import as any).meta.env = {
      VITE_API_BASE_URL: ''
    };
  });

  const createMockResponse = (ok: boolean, data: any, status = 200) => ({
    ok,
    status,
    statusText: ok ? 'OK' : 'Error',
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
    formData: jest.fn().mockResolvedValue(new FormData())
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
    // Set up environment
    (global.import as any).meta.env = env;

    const mockData = { bots: [] };
    mockFetch.mockResolvedValue(createMockResponse(true, mockData));

    // Import service dynamically to pick up new env
    const { apiService } = await import('../../../src/client/src/services/api');

    await apiService.getConfig();
    expect(mockFetch).toHaveBeenCalledWith(expectedUrl, expect.any(Object));
  });

  it('error recovery: handles invalid URL by attempting fetch', async () => {
    (global.import as any).meta.env = { VITE_API_BASE_URL: 'invalid://url' };

    const mockResponse = createMockResponse(false, {}, 'Network Error', 404);
    mockFetch.mockResolvedValue(mockResponse);

    const { apiService } = await import('../../../src/client/src/services/api');

    await expect(apiService.getConfig()).rejects.toThrow('API request failed: Network Error');
    expect(mockFetch).toHaveBeenCalledWith('invalid://url/webui/api/config', expect.any(Object));
  });

  it('handles API error in request', async () => {
    const mockResponse = createMockResponse(false, {}, 'Not Found', 404);
    mockFetch.mockResolvedValue(mockResponse);

    (global.import as any).meta.env = { VITE_API_BASE_URL: '' };
    const { apiService } = await import('../../../src/client/src/services/api');

    await expect(apiService.getConfig()).rejects.toThrow('API request failed: Not Found');
  });
});
