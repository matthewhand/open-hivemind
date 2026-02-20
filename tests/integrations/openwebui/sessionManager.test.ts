import axios from 'axios';

// Silence debug logs during tests
jest.mock('debug', () => () => jest.fn());

// IMPORTANT: Use literal path and return a live object whose getProperties returns current props.
// This avoids hoist/TDZ issues and allows us to update credentials per test if needed.
const mockedConfig = {
  props: {
    apiUrl: 'http://host.docker.internal:3000/api/',
    username: 'admin',
    password: 'password123',
    knowledgeFile: '',
    model: 'llama3.2',
  },
  getProperties() {
    return this.props;
  },
};
jest.mock('../../../src/integrations/openwebui/openWebUIConfig', () => ({
  __esModule: true,
  default: mockedConfig,
}));

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Ensure axios.create returns the same mock so instance.post is captured
(mockedAxios as any).create = jest.fn(() => mockedAxios);

// Helper to import a fresh isolated copy so module-level caches reset and mocks apply
/**
 * Load sessionManager inside an isolated module registry with hard-stubbed dependencies.
 * Allows priming axiosPost BEFORE requiring the module under test.
 */
function loadIsolated(prime: (deps: { axiosPost: jest.Mock }) => void) {
  jest.resetModules();
  const axiosPost = jest.fn();

  jest.doMock('../../../src/integrations/openwebui/openWebUIConfig', () => ({
    __esModule: true,
    default: {
      getProperties: () => ({
        apiUrl: 'http://host.docker.internal:3000/api/',
        username: 'admin',
        password: 'password123',
        knowledgeFile: '',
        model: 'llama3.2',
      }),
    },
  }));

  jest.doMock('axios', () => {
    const axiosMock: any = { post: axiosPost };
    axiosMock.create = jest.fn(() => ({ post: axiosPost }));
    return { __esModule: true, default: axiosMock };
  });

  let mod: any;
  jest.isolateModules(() => {
    prime({ axiosPost });
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    mod = require('../../../src/integrations/openwebui/sessionManager');
  });
  return { mod, axiosPost };
}

describe('openwebui/sessionManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns cached session key on subsequent calls', async () => {
    const { mod, axiosPost } = loadIsolated(({ axiosPost }) => {
      axiosPost.mockResolvedValueOnce({ data: { sessionKey: 'sk-111' } });
    });

    const { getSessionKey } = mod;

    const first = await getSessionKey();
    const second = await getSessionKey();

    expect(first).toBe('sk-111');
    expect(second).toBe('sk-111');
    expect(axiosPost).toHaveBeenCalledTimes(1);
    const url = axiosPost.mock.calls[0]?.[0] ?? '';
    expect(url).toMatch(/\/auth\/login$/);
  });

  it('throws "Authentication failed" when login request rejects', async () => {
    const { mod } = loadIsolated(({ axiosPost }) => {
      axiosPost.mockRejectedValueOnce(new Error('network'));
    });

    const { getSessionKey } = mod;
    await expect(getSessionKey()).rejects.toThrow('Authentication failed');
  });

  it('throws when API responds without sessionKey', async () => {
    const { mod } = loadIsolated(({ axiosPost }) => {
      axiosPost.mockResolvedValueOnce({ data: {} });
    });

    const { getSessionKey } = mod;
    await expect(getSessionKey()).rejects.toThrow('Authentication failed');
  });

  it('refreshSessionKey resets cache and fetches a new key', async () => {
    const { mod, axiosPost } = loadIsolated(({ axiosPost }) => {
      axiosPost
        .mockResolvedValueOnce({ data: { sessionKey: 'sk-old' } })
        .mockResolvedValueOnce({ data: { sessionKey: 'sk-new' } });
    });

    const { getSessionKey, refreshSessionKey } = mod;

    const first = await getSessionKey();
    expect(first).toBe('sk-old');
    expect(axiosPost).toHaveBeenCalledTimes(1);

    await refreshSessionKey();

    const second = await getSessionKey();
    expect(second).toBe('sk-new');
    expect(axiosPost).toHaveBeenCalledTimes(2);

    const firstUrl = axiosPost.mock.calls[0]?.[0] ?? '';
    const secondUrl = axiosPost.mock.calls[1]?.[0] ?? '';
    expect(firstUrl).toMatch(/\/auth\/login$/);
    expect(secondUrl).toMatch(/\/auth\/login$/);
  });
});
