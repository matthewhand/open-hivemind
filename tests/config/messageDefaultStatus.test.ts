describe('messageDefaultStatus', () => {
  let getMessageDefaultStatus: typeof import('../../src/config/messageDefaultStatus').getMessageDefaultStatus;
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
    getMessageDefaultStatus = require('../../src/config/messageDefaultStatus').getMessageDefaultStatus;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return configured: false when no providers', () => {
    mockGetAllProviders.mockReturnValue([]);
    const status = getMessageDefaultStatus();
    expect(status.configured).toBe(false);
    expect(status.providers).toEqual([]);
  });

  it('should return configured: true when enabled providers exist', () => {
    mockGetAllProviders.mockReturnValue([
      { id: '1', name: 'Discord', type: 'discord', enabled: true },
    ]);
    const status = getMessageDefaultStatus();
    expect(status.configured).toBe(true);
    expect(status.providers).toHaveLength(1);
    expect(status.providers[0]).toEqual({ id: '1', name: 'Discord', type: 'discord' });
  });

  it('should filter out disabled providers', () => {
    mockGetAllProviders.mockReturnValue([
      { id: '1', name: 'Discord', type: 'discord', enabled: true },
      { id: '2', name: 'Slack', type: 'slack', enabled: false },
    ]);
    const status = getMessageDefaultStatus();
    expect(status.providers).toHaveLength(1);
    expect(status.providers[0].name).toBe('Discord');
  });

  it('should map provider fields correctly', () => {
    mockGetAllProviders.mockReturnValue([
      { id: 'x', name: 'Test', type: 'test', enabled: true, extraField: 'ignored' },
    ]);
    const status = getMessageDefaultStatus();
    const provider = status.providers[0];
    expect(Object.keys(provider)).toEqual(['id', 'name', 'type']);
  });
});
