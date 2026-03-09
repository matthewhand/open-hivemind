jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
}));

import * as fs from 'fs';
import { getTrustedMcpReposConfig } from '../../src/config/trustedMcpRepos';

const mockedFs = fs as jest.Mocked<typeof fs>;

describe('trustedMcpRepos config loader', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('returns defaults when the config file does not exist', () => {
    mockedFs.existsSync.mockReturnValue(false);

    const config = getTrustedMcpReposConfig();

    expect(config.trustedRepositories).toEqual([]);
    expect(config.cautionRepositories).toEqual([]);
    expect(config.settings.showTrustIndicator).toBe(true);
    expect(config.settings.defaultTrustLevel).toBe('caution');
  });

  test('normalizes repository entries from disk', () => {
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.readFileSync.mockReturnValue(
      JSON.stringify({
        trustedRepositories: [
          {
            owner: 'matthewhand',
            repo: 'open-hivemind',
            name: 'Open Hivemind',
            verified: true,
          },
          { owner: 'invalid-only' },
        ],
        cautionRepositories: [
          {
            owner: 'example',
            repo: 'needs-review',
            name: 'Needs Review',
            verified: false,
          },
        ],
        settings: {
          requireVerifiedForProduction: true,
          showTrustIndicator: false,
          defaultTrustLevel: 'trusted',
        },
        metadata: {
          version: '1.0.0',
        },
      })
    );

    const config = getTrustedMcpReposConfig();

    expect(config.trustedRepositories).toHaveLength(1);
    expect(config.trustedRepositories[0]).toMatchObject({
      owner: 'matthewhand',
      repo: 'open-hivemind',
      name: 'Open Hivemind',
      verified: true,
    });
    expect(config.cautionRepositories).toHaveLength(1);
    expect(config.settings.requireVerifiedForProduction).toBe(true);
    expect(config.settings.showTrustIndicator).toBe(false);
    expect(config.settings.defaultTrustLevel).toBe('trusted');
  });
});
