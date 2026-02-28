import { MattermostService } from '@hivemind/adapter-mattermost';
import mattermostConfig from '../../src/config/mattermostConfig';
import { MattermostProvider } from '../../src/providers/MattermostProvider';

// Mock dependencies
jest.mock('@hivemind/adapter-mattermost', () => ({
  MattermostService: {
    getInstance: jest.fn(() => ({
      // Stubs
    })),
  },
}));

describe('MattermostProvider', () => {
  let provider: MattermostProvider;

  beforeEach(() => {
    provider = new MattermostProvider();
  });

  it('should have correct id and type', () => {
    expect(provider.id).toBe('mattermost');
    expect(provider.type).toBe('messenger');
    expect(provider.label).toBe('Mattermost');
  });

  it('should return schema', () => {
    const schema = provider.getSchema();
    expect(schema).toBeDefined();
    // Verify properties from mattermostConfig
    const props = (schema as any).properties || (schema as any)._cvtProperties || schema;
    expect(props.MATTERMOST_SERVER_URL).toBeDefined();
  });

  it('should return sensitive keys', () => {
    expect(provider.getSensitiveKeys()).toContain('MATTERMOST_TOKEN');
  });

  it('should get status (placeholder)', async () => {
    const status = await provider.getStatus();
    expect(status.ok).toBe(true);
    expect(status.bots).toEqual([]);
  });

  it('should throw error for unimplemented addBot', async () => {
    await expect(provider.addBot({})).rejects.toThrow('Method not implemented.');
  });
});
