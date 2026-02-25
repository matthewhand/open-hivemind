import { MattermostProvider } from '../../../src/providers/MattermostProvider';
import mattermostConfig from '../../../src/config/mattermostConfig';

// Mocks
jest.mock('../../../src/config/mattermostConfig', () => ({
  __esModule: true,
  default: {
    getSchema: jest.fn(),
    get: jest.fn(),
  },
}));

// Mock @hivemind/adapter-mattermost if it's imported in the provider
jest.mock('@hivemind/adapter-mattermost', () => ({
  MattermostService: {
    getInstance: jest.fn(),
  },
}), { virtual: true });

describe('MattermostProvider', () => {
  let provider: MattermostProvider;

  beforeEach(() => {
    provider = new MattermostProvider();
    jest.clearAllMocks();
  });

  it('should have correct metadata', () => {
    expect(provider.id).toBe('mattermost');
    expect(provider.type).toBe('messenger');
    expect(provider.label).toBe('Mattermost');
  });

  it('should return schema from config', () => {
    const mockSchema = { type: 'object' };
    (mattermostConfig.getSchema as jest.Mock).mockReturnValue(mockSchema);
    expect(provider.getSchema()).toBe(mockSchema);
  });

  it('should return sensitive keys', () => {
    expect(provider.getSensitiveKeys()).toContain('MATTERMOST_TOKEN');
  });

  it('should have unimplemented methods for now', async () => {
    const status = await provider.getStatus();
    expect(status.ok).toBe(true);

    expect(provider.getBotNames()).toEqual([]);
    expect(await provider.getBots()).toEqual([]);

    await expect(provider.addBot({})).rejects.toThrow('Method not implemented');
  });
});
