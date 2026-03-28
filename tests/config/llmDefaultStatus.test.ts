describe('llmDefaultStatus', () => {
  let getLlmDefaultStatus: typeof import('../../src/config/llmDefaultStatus').getLlmDefaultStatus;
  const mockGetAllProviders = jest.fn().mockReturnValue([]);

  beforeEach(() => {
    jest.resetModules();

    jest.doMock('../../src/config/ProviderConfigManager', () => ({
      __esModule: true,
      default: {
        getInstance: () => ({
          getAllProviders: mockGetAllProviders,
        }),
      },
    }));

    mockGetAllProviders.mockClear();
    getLlmDefaultStatus = require('../../src/config/llmDefaultStatus').getLlmDefaultStatus;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return configured: false when no providers', () => {
    mockGetAllProviders.mockReturnValue([]);
    const status = getLlmDefaultStatus();
    expect(status.configured).toBe(false);
    expect(status.providers).toEqual([]);
  });

  it('should return configured: true when enabled providers exist', () => {
    mockGetAllProviders.mockReturnValue([
      { id: '1', name: 'OpenAI', type: 'openai', enabled: true },
    ]);
    const status = getLlmDefaultStatus();
    expect(status.configured).toBe(true);
    expect(status.providers).toHaveLength(1);
    expect(status.providers[0]).toEqual({ id: '1', name: 'OpenAI', type: 'openai' });
  });

  it('should filter out disabled providers', () => {
    mockGetAllProviders.mockReturnValue([
      { id: '1', name: 'OpenAI', type: 'openai', enabled: true },
      { id: '2', name: 'Flowise', type: 'flowise', enabled: false },
    ]);
    const status = getLlmDefaultStatus();
    expect(status.providers).toHaveLength(1);
  });

  it('should include libraryStatus', () => {
    mockGetAllProviders.mockReturnValue([]);
    const status = getLlmDefaultStatus();
    expect(status.libraryStatus).toBeDefined();
    expect(typeof status.libraryStatus).toBe('object');
    expect(status.libraryStatus).toHaveProperty('openai');
    expect(status.libraryStatus).toHaveProperty('flowise');
  });

  it('should report correct library package names', () => {
    mockGetAllProviders.mockReturnValue([]);
    const status = getLlmDefaultStatus();
    expect(status.libraryStatus.openai.package).toBe('openai');
    expect(status.libraryStatus.flowise.package).toBe('flowise-sdk');
    expect(typeof status.libraryStatus.openai.installed).toBe('boolean');
  });
});
