import fs from 'fs';
import { SecureConfigManager } from '../../../src/config/SecureConfigManager';
import Debug from 'debug';

// We need to mock 'debug' to intercept the logging.
jest.mock('debug', () => {
  const mockDebug = jest.fn();
  return jest.fn(() => mockDebug);
});

describe('SecureConfigManager rotation logic', () => {
  let manager: SecureConfigManager;
  let mockDebug: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Set up fs mocks
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    jest.spyOn(fs, 'readFileSync').mockReturnValue(Buffer.from('32-byte-long-secret-key-for-test!!'));
    jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
    jest.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined);
    jest.spyOn(fs.promises, 'readFile').mockResolvedValue('encrypted-data');

    // Re-initialize manager
    // @ts-ignore
    SecureConfigManager.instance = null;
    manager = SecureConfigManager.getInstance();

    // Get the mocked debug instance
    mockDebug = Debug('app:SecureConfigManager') as jest.Mock;

    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-03-01T00:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  // we can mock decrypt and calculateChecksum to bypass encryption
  const mockConfig = (data: any) => {
    jest.spyOn(manager, 'decrypt').mockReturnValue(JSON.stringify(data));
    jest.spyOn(manager as any, 'calculateChecksum').mockReturnValue(data.checksum);
  };

  it('should warn when config is due for rotation', async () => {
    mockConfig({
      id: 'test-1',
      name: 'Test Config',
      updatedAt: new Date('2024-01-01T00:00:00.000Z').toISOString(), // 60 days ago
      rotationInterval: 30, // 30 days
      data: { key: 'value' },
      checksum: 'valid-checksum'
    });

    await manager.getConfig('test-1');

    expect(mockDebug).toHaveBeenCalledWith(
      expect.stringContaining('is due for credential rotation (Interval: 30 days, Days since update: 60 days)')
    );
  });

  it('should not warn when config is not due for rotation', async () => {
    mockConfig({
      id: 'test-2',
      name: 'Test Config',
      updatedAt: new Date('2024-02-15T00:00:00.000Z').toISOString(), // 15 days ago
      rotationInterval: 30, // 30 days
      data: { key: 'value' },
      checksum: 'valid-checksum'
    });

    await manager.getConfig('test-2');

    expect(mockDebug).not.toHaveBeenCalledWith(
      expect.stringContaining('is due for credential rotation')
    );
  });

  it('should not warn when rotationInterval is 0 or undefined', async () => {
    mockConfig({
      id: 'test-3',
      name: 'Test Config',
      updatedAt: new Date('2023-01-01T00:00:00.000Z').toISOString(), // Long ago
      rotationInterval: 0,
      data: { key: 'value' },
      checksum: 'valid-checksum'
    });

    await manager.getConfig('test-3');

    expect(mockDebug).not.toHaveBeenCalledWith(
      expect.stringContaining('is due for credential rotation')
    );
  });

  it('should not warn when data is empty', async () => {
    mockConfig({
      id: 'test-4',
      name: 'Test Config',
      updatedAt: new Date('2024-01-01T00:00:00.000Z').toISOString(), // 60 days ago
      rotationInterval: 30, // 30 days
      data: {}, // No keys configured
      checksum: 'valid-checksum'
    });

    await manager.getConfig('test-4');

    expect(mockDebug).not.toHaveBeenCalledWith(
      expect.stringContaining('is due for credential rotation')
    );
  });
});
