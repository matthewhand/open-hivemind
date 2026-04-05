import * as path from 'path';
import { ConfigurationImportExportService } from '../../src/server/services/ConfigurationImportExportService';

// Mock DatabaseManager
jest.mock('../../src/database/DatabaseManager', () => ({
  DatabaseManager: {
    getInstance: jest.fn().mockReturnValue({}),
  },
}));

// Mock ConfigurationTemplateService
jest.mock('../../src/server/services/ConfigurationTemplateService', () => ({
  ConfigurationTemplateService: {
    getInstance: jest.fn().mockReturnValue({}),
  },
}));

// Mock ConfigurationVersionService
jest.mock('../../src/server/services/ConfigurationVersionService', () => ({
  ConfigurationVersionService: {
    getInstance: jest.fn().mockReturnValue({}),
  },
}));

// Mock BackupManager constructor
jest.mock('../../src/server/services/configImportExport/backupManager.ts', () => {
  const actual = jest.requireActual('../../src/server/services/configImportExport/backupManager.ts');
  return {
    ...actual,
    BackupManager: class extends actual.BackupManager {
      listBackups = jest.fn();
    }
  };
});

describe('ConfigurationImportExportService Path Security', () => {
  let service: ConfigurationImportExportService;

  beforeEach(() => {
    service = ConfigurationImportExportService.getInstance();
  });

  it('getBackupFilePath should sanitize malicious backup names to safe paths', async () => {
    const maliciousName = '../../etc/passwd';
    const createdAt = new Date(1600000000000);

    // Get the backupManager instance and mock its listBackups method
    // @ts-ignore - accessing private property for testing
    const backupManager = service['backupManager'];
    backupManager.listBackups.mockResolvedValueOnce([
      {
        id: 'malicious-id',
        name: maliciousName,
        createdAt: createdAt,
        createdBy: 'admin',
        configCount: 0,
        versionCount: 0,
        templateCount: 0,
        size: 0,
        checksum: '',
        encrypted: false,
        compressed: false,
      },
    ]);

    const result = await service.getBackupFilePath('malicious-id');

    // PathSecurityUtils.sanitizeFilename strips directory components via path.basename
    // '../../etc/passwd' becomes 'passwd', resulting in a safe path within backups dir
    expect(result).not.toBeNull();
    expect(result).toContain('backup-passwd-1600000000000.json.gz');
    expect(path.isAbsolute(result!)).toBe(true);
    // Verify the path is within the backups directory
    expect(result).toContain('config/backups');
  });

  it('getBackupFilePath should return a valid path for safe names', async () => {
    const safeName = 'my-backup';
    const createdAt = new Date(1600000000000);

    // Get the backupManager instance and mock its listBackups method
    // @ts-ignore - accessing private property for testing
    const backupManager = service['backupManager'];
    backupManager.listBackups.mockResolvedValueOnce([
      {
        id: 'safe-id',
        name: safeName,
        createdAt: createdAt,
        createdBy: 'admin',
        configCount: 0,
        versionCount: 0,
        templateCount: 0,
        size: 0,
        checksum: '',
        encrypted: false,
        compressed: false,
      },
    ]);

    const result = await service.getBackupFilePath('safe-id');

    expect(result).not.toBeNull();
    expect(result).toContain('backup-my-backup-1600000000000.json.gz');
    expect(path.isAbsolute(result!)).toBe(true);
  });
});