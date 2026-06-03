import { promises as fs } from 'fs';
import * as path from 'path';
import { ConfigExporter } from '@src/server/services/config/ConfigExporter';
import { DatabaseManager } from '@src/database/DatabaseManager';

// Mock dependencies
jest.mock('@src/database/DatabaseManager');
jest.mock('@src/server/services/ConfigurationTemplateService');
jest.mock('@src/server/services/ConfigurationVersionService');
jest.mock('@src/config/SecureConfigManager', () => ({
  SecureConfigManager: {
    getInstance: jest.fn().mockResolvedValue({
      getDecryptedMainConfig: jest.fn().mockResolvedValue({ some: 'config' }),
    }),
  },
}));
// Preserve the real `fs` module (existsSync/readFileSync are needed at import time
// by transitively-loaded modules such as EncryptionService); only stub the
// promise-based write/mkdir calls that the exporter performs.
jest.mock('fs', () => {
  const actual = jest.requireActual('fs');
  return {
    ...actual,
    promises: {
      ...actual.promises,
      writeFile: jest.fn().mockResolvedValue(undefined),
      mkdir: jest.fn().mockResolvedValue(undefined),
    },
  };
});

describe('ConfigExporter Path Traversal', () => {
  const exportsDir = path.resolve('/tmp/exports');
  let exporter: ConfigExporter;
  let mockDb: { getBotConfigurationsBulk: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb = { getBotConfigurationsBulk: jest.fn().mockResolvedValue([]) };
    (DatabaseManager.getInstance as jest.Mock).mockReturnValue(mockDb);
    exporter = ConfigExporter.create(exportsDir);
  });

  it('sanitizes path traversal in fileName for exportConfigurations', async () => {
    mockDb.getBotConfigurationsBulk.mockResolvedValue([{ id: 1, name: 'test-bot' } as any]);

    const traversalFileName = '../../../tmp/traversal-test';
    const options = { format: 'json' } as any;

    await exporter.exportConfigurations([1], options, traversalFileName);

    const writeCalls = (fs.writeFile as jest.Mock).mock.calls;
    expect(writeCalls.length).toBeGreaterThan(0);
    const actualPath = writeCalls[0][0];

    // PathSecurityUtils.getSafePath strips the traversal sequence to the basename.
    const expectedSafePath = path.join(exportsDir, 'traversal-test.json');
    expect(actualPath).toBe(expectedSafePath);
    expect(actualPath.startsWith(exportsDir)).toBe(true);
  });

  it('sanitizes path traversal in fileName for exportMainConfig', async () => {
    const traversalFileName = '../../../tmp/traversal-test-main';
    const options = { format: 'json' } as any;

    await exporter.exportMainConfig('development', options, traversalFileName);

    const writeCalls = (fs.writeFile as jest.Mock).mock.calls;
    expect(writeCalls.length).toBeGreaterThan(0);
    const actualPath = writeCalls[0][0];

    const expectedSafePath = path.join(exportsDir, 'traversal-test-main.json');
    expect(actualPath).toBe(expectedSafePath);
    expect(actualPath.startsWith(exportsDir)).toBe(true);
  });
});
