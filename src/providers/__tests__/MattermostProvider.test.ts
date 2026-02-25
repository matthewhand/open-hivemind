import { MattermostProvider } from '../MattermostProvider';
import { MattermostService } from '@hivemind/adapter-mattermost';
import fs from 'fs';
import path from 'path';

// Mock dependencies
jest.mock('@hivemind/adapter-mattermost', () => ({
  MattermostService: {
    getInstance: jest.fn(),
  },
}));

// Mock config module
jest.mock('../../config/mattermostConfig', () => ({
  __esModule: true,
  default: {
    getSchema: jest.fn(() => ({})),
    get: jest.fn(),
    loadFile: jest.fn(),
    validate: jest.fn(),
  },
}));

describe('MattermostProvider', () => {
  let provider: MattermostProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new MattermostProvider();
  });

  it('should have correct metadata', () => {
    expect(provider.id).toBe('mattermost');
    expect(provider.label).toBe('Mattermost');
    expect(provider.type).toBe('messenger');
    expect(provider.getSensitiveKeys()).toEqual(['MATTERMOST_TOKEN']);
  });

  it('should return schema and config', () => {
    expect(provider.getSchema()).toEqual({});
    expect(provider.getConfig()).toBeDefined();
  });

  it('should return empty status for now', async () => {
    const status = await provider.getStatus();
    expect(status.ok).toBe(true);
    expect(status.bots).toEqual([]);
    expect(status.count).toBe(0);
  });
});
