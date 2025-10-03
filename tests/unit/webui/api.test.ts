import { apiService } from '../../../src/client/src/services/api';
import { jest } from '@jest/globals';

declare global {
  interface ImportMetaEnv {
    VITE_API_BASE_URL: string;
  }
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

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
  };
  return res;
};

describe('API Service URL Handling', () => {
  beforeEach(() => {
    jest.resetModules();
    // Set default env
    Object.defineProperty(import.meta, 'env', {
      value: { VITE_API_BASE_URL: '' } as ImportMetaEnv,
      writable: true
    });
  });

  it('getConfig uses relative URLs when VITE_API_BASE_URL is empty', async () => {
    const mockData = { bots: [] };
    const mockFetch = jest.fn<jest.MockedFunction<typeof fetch>>().mockResolvedValue(createMockResponse(true, mockData));
    (global.fetch as jest.MockedFunction<typeof fetch>) = mockFetch;

    const { apiService: service } = await import('../../../src/client/src/services/api');

    await service.getConfig();
    expect(mockFetch).toHaveBeenCalledWith('/webui/api/config', expect.any(Object));
  });

  it('getConfig uses absolute URLs when VITE_API_BASE_URL is set', async () => {
    Object.defineProperty(import.meta, 'env', {
      value: { VITE_API_BASE_URL: 'https://api.example.com' } as ImportMetaEnv,
      writable: true
    });

    const mockData = { bots: [] };
    const mockFetch = jest.fn<jest.MockedFunction<typeof fetch>>().mockResolvedValue(createMockResponse(true, mockData));
    (global.fetch as jest.MockedFunction<typeof fetch>) = mockFetch;

    const { apiService: service } = await import('../../../src/client/src/services/api');

    await service.getConfig();
    expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/webui/api/config', expect.any(Object));
  });

  it('strips trailing slash from VITE_API_BASE_URL', async () => {
    Object.defineProperty(import.meta, 'env', {
      value: { VITE_API_BASE_URL: 'https://api.example.com/' } as ImportMetaEnv,
      writable: true
    });

    const mockData = { bots: [] };
    const mockFetch = jest.fn<jest.MockedFunction<typeof fetch>>().mockResolvedValue(createMockResponse(true, mockData));
    (global.fetch as jest.MockedFunction<typeof fetch>) = mockFetch;

    const { apiService: service } = await import('../../../src/client/src/services/api');

    await service.getConfig();
    expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/webui/api/config', expect.any(Object));
  });

  it('handles URL switching by mocking different env values', async () => {
    // Test1: Empty - relative
    Object.defineProperty(import.meta, 'env', { value: { VITE_API_BASE_URL: '' } as ImportMetaEnv, writable: true });
    const mockData1 = { bots: [] };
    const mockFetch1 = jest.fn<jest.MockedFunction<typeof fetch>>().mockResolvedValue(createMockResponse(true, mockData1));
    (global.fetch as jest.MockedFunction<typeof fetch>) = mockFetch1;

    const { apiService: service1 } = await import('../../../src/client/src/services/api');
    await service1.getConfig();
    expect(mockFetch1).toHaveBeenCalledWith('/webui/api/config', expect.any(Object));

    // Test2: Switch to custom - absolute
    Object.defineProperty(import.meta, 'env', { value: { VITE_API_BASE_URL: 'http://localhost:8080' } as ImportMetaEnv, writable: true });
    const mockData2 = { bots: [] };
    const mockFetch2 = jest.fn<jest.MockedFunction<typeof fetch>>().mockResolvedValue(createMockResponse(true, mockData2));
    (global.fetch as jest.MockedFunction<typeof fetch>) = mockFetch2;

    const { apiService: service2 } = await import('../../../src/client/src/services/api');
    await service2.getConfig();
    expect(mockFetch2).toHaveBeenCalledWith('http://localhost:8080/webui/api/config', expect.any(Object));
  });

  it('error recovery: handles invalid URL by attempting fetch (which would fail in real)', async () => {
    Object.defineProperty(import.meta, 'env', { value: { VITE_API_BASE_URL: 'invalid://url' } as ImportMetaEnv, writable: true });

    const mockResponse = createMockResponse(false, {}, 'Network Error');
    const mockFetch = jest.fn<jest.MockedFunction<typeof fetch>>().mockResolvedValue(mockResponse);
    (global.fetch as jest.MockedFunction<typeof fetch>) = mockFetch;

    const { apiService: service } = await import('../../../src/client/src/services/api');

    await expect(service.getConfig()).rejects.toThrow('API request failed: Network Error');
    expect(mockFetch).toHaveBeenCalledWith('invalid://url/webui/api/config', expect.any(Object));
  });

  it('handles API error in request', async () => {
    const mockResponse = createMockResponse(false, {}, 'Not Found');
    const mockFetch = jest.fn<jest.MockedFunction<typeof fetch>>().mockResolvedValue(mockResponse);
    (global.fetch as jest.MockedFunction<typeof fetch>) = mockFetch;

    Object.defineProperty(import.meta, 'env', { value: { VITE_API_BASE_URL: '' } as ImportMetaEnv, writable: true });
    const { apiService: service } = await import('../../../src/client/src/services/api');

    await expect(service.getConfig()).rejects.toThrow('API request failed: Not Found');
  });
});