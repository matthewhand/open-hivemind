import { getSessionKey, refreshSessionKey } from '../../../packages/llm-openwebui/src/sessionManager';

// Silence debug logs during tests
jest.mock('debug', () => () => jest.fn());

// IMPORTANT: Mock shared-types http utility since sessionManager uses it
jest.mock('@hivemind/shared-types', () => {
  const actual = jest.requireActual('@hivemind/shared-types');
  return {
    ...actual,
    http: {
      post: jest.fn(),
    },
    isSafeUrl: jest.fn().mockResolvedValue({ safe: true }),
  };
});

import { http } from '@hivemind/shared-types';
const mockedHttp = http as jest.Mocked<typeof http>;

const mockedConfig = {
  props: {
    apiUrl: 'http://host.docker.internal:3000/api',
    username: 'admin',
    password: 'password123',
    knowledgeFile: '',
    model: 'llama3.2',
  },
  getProperties() {
    return this.props;
  },
};

jest.mock(
  '@integrations/openwebui/openWebUIConfig',
  () => ({
    __esModule: true,
    default: mockedConfig,
  }),
  { virtual: true }
);

// We need to test the module in isolation to reset the module-level 'sessionKey' variable
/**
 * Load sessionManager inside an isolated module registry.
 */
function loadIsolated() {
  jest.resetModules();
  
  // Re-mock dependencies for the isolated module
  jest.doMock('@hivemind/shared-types', () => ({
    http: {
      post: jest.fn().mockImplementation((url) => {
        if (url.includes('/auth/login')) {
          return Promise.resolve({ sessionKey: 'test-token' });
        }
        return Promise.resolve({});
      }),
    },
    isSafeUrl: jest.fn().mockResolvedValue({ safe: true }),
  }));

  jest.doMock('@integrations/openwebui/openWebUIConfig', () => ({
    __esModule: true,
    default: mockedConfig,
  }));

  const isolatedHttp = require('@hivemind/shared-types').http;
  const mod = require('../../../packages/llm-openwebui/src/sessionManager');
  
  return { mod, isolatedHttp };
}

describe('openwebui/sessionManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns cached session key on subsequent calls', async () => {
    const { mod, isolatedHttp } = loadIsolated();
    isolatedHttp.post.mockResolvedValueOnce({ sessionKey: 'sk-111' });

    const first = await mod.getSessionKey();
    const second = await mod.getSessionKey();

    expect(first).toBe('sk-111');
    expect(second).toBe('sk-111');
    expect(isolatedHttp.post).toHaveBeenCalledTimes(1);
    const url = isolatedHttp.post.mock.calls[0]?.[0] ?? '';
    expect(url).toBe('http://host.docker.internal:3000/api/auth/login');
  });

  it('throws "Authentication failed" when login request rejects', async () => {
    const { mod, isolatedHttp } = loadIsolated();
    isolatedHttp.post.mockRejectedValueOnce(new Error('network'));

    await expect(mod.getSessionKey()).rejects.toThrow('Authentication failed');
  });

  it('throws when API responds without sessionKey', async () => {
    const { mod, isolatedHttp } = loadIsolated();
    isolatedHttp.post.mockResolvedValueOnce({});

    await expect(mod.getSessionKey()).rejects.toThrow('Authentication failed');
  });

  it('refreshSessionKey resets cache and fetches a new key', async () => {
    const { mod, isolatedHttp } = loadIsolated();
    isolatedHttp.post
      .mockResolvedValueOnce({ sessionKey: 'sk-old' })
      .mockResolvedValueOnce({ sessionKey: 'sk-new' });

    const first = await mod.getSessionKey();
    expect(first).toBe('sk-old');
    expect(isolatedHttp.post).toHaveBeenCalledTimes(1);

    await mod.refreshSessionKey();

    const second = await mod.getSessionKey();
    expect(second).toBe('sk-new');
    expect(isolatedHttp.post).toHaveBeenCalledTimes(2);
  });
});
