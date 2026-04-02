import fs from 'fs/promises';
import path from 'path';
import { ConfigurationImportExportService } from '../../src/server/services/ConfigurationImportExportService';
import { DatabaseManager } from '../../src/database/DatabaseManager';
import { UserConfigStore } from '../../src/config/UserConfigStore';
import { AuditLogger } from '../../src/common/auditLogger';

// Mock dependencies
jest.mock('../../src/database/DatabaseManager');
jest.mock('../../src/config/UserConfigStore');
jest.mock('../../src/common/auditLogger');

describe('Import/Export Integration Tests', () => {
  let service: ConfigurationImportExportService;
  let mockDbManager: jest.Mocked<DatabaseManager>;
  let testDir: string;

  beforeAll(async () => {
    testDir = path.join(__dirname, 'temp_integration_test');
    await fs.mkdir(testDir, { recursive: true });
  });

  afterAll(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset singleton
    (ConfigurationImportExportService as any).instance = undefined;

    // Setup mocks
    mockDbManager = {
      getAllBotConfigurations: jest.fn().mockResolvedValue([
        { id: 1, name: 'Config 1', messageProvider: 'discord' },
        { id: 2, name: 'Config 2', messageProvider: 'slack' },
      ]),
      getBotConfiguration: jest.fn().mockImplementation((id: number) => {
        const configs = [
          { id: 1, name: 'Config 1', messageProvider: 'discord' },
          { id: 2, name: 'Config 2', messageProvider: 'slack' },
        ];
        return Promise.resolve(configs.find((c) => c.id === id));
      }),
      createBotConfiguration: jest.fn().mockResolvedValue(3),
      updateBotConfiguration: jest.fn().mockResolvedValue(undefined),
      getBotConfigurationVersions: jest.fn().mockResolvedValue([]),
      createBotConfigurationVersion: jest.fn().mockResolvedValue(1),
      getBotConfigurationAuditBulk: jest.fn().mockResolvedValue(new Map()),
      getBotConfigurationsBulk: jest.fn().mockImplementation((ids: number[]) => {
        const configs = [
          { id: 1, name: 'Config 1', messageProvider: 'discord' },
          { id: 2, name: 'Config 2', messageProvider: 'slack' },
        ];
        return Promise.resolve(configs.filter((c) => ids.includes(c.id as number)));
      }),
    } as any;

    (DatabaseManager.getInstance as jest.Mock).mockReturnValue(mockDbManager);

    (UserConfigStore.getInstance as jest.Mock).mockReturnValue({
      getGeneralSettings: jest.fn().mockReturnValue({
        backupRetentionLimit: 10,
        enableColdStorage: false,
      }),
    });

    (AuditLogger.getInstance as jest.Mock).mockReturnValue({
      logAdminAction: jest.fn(),
    });

    service = ConfigurationImportExportService.getInstance();
  });

  describe('Full Export/Import Workflow', () => {
    it('should export and then import configurations', async () => {
      // Export
      const exportResult = await service.exportConfigurations(
        [1, 2],
        {
          format: 'json',
          includeVersions: false,
          includeAuditLogs: false,
          includeTemplates: false,
          compress: false,
          encrypt: false,
        },
        'test-export',
        'admin'
      );

      expect(exportResult.success).toBe(true);
      expect(exportResult.filePath).toBeDefined();

      // Verify file was created
      const fileExists = await fs
        .access(exportResult.filePath!)
        .then(() => true)
        .catch(() => false);
      expect(fileExists).toBe(true);

      // Import
      const importResult = await service.importConfigurations(
        exportResult.filePath!,
        {
          format: 'json',
          overwrite: true,
          skipValidation: true,
        },
        'admin'
      );

      expect(importResult.success).toBe(true);
      expect(importResult.importedCount).toBeGreaterThan(0);

      // Cleanup
      await fs.unlink(exportResult.filePath!);
    });

    it('should handle compressed exports and imports', async () => {
      const exportResult = await service.exportConfigurations(
        [1, 2],
        {
          format: 'json',
          compress: true,
          encrypt: false,
        },
        'compressed-export',
        'admin'
      );

      expect(exportResult.success).toBe(true);
      expect(exportResult.filePath).toContain('.gz');

      const importResult = await service.importConfigurations(
        exportResult.filePath!,
        {
          format: 'json',
          overwrite: true,
          skipValidation: true,
        },
        'admin'
      );

      expect(importResult.success).toBe(true);

      await fs.unlink(exportResult.filePath!);
    });

    it('should handle encrypted exports and imports', async () => {
      const encryptionKey = 'test-password-123';

      const exportResult = await service.exportConfigurations(
        [1, 2],
        {
          format: 'json',
          encrypt: true,
          encryptionKey,
          compress: false,
        },
        'encrypted-export',
        'admin'
      );

      expect(exportResult.success).toBe(true);
      expect(exportResult.filePath).toContain('.enc');

      const importResult = await service.importConfigurations(
        exportResult.filePath!,
        {
          format: 'json',
          decryptionKey: encryptionKey,
          overwrite: true,
          skipValidation: true,
        },
        'admin'
      );

      expect(importResult.success).toBe(true);

      await fs.unlink(exportResult.filePath!);
    });

    it('should handle both compression and encryption', async () => {
      const encryptionKey = 'strong-password-456';

      const exportResult = await service.exportConfigurations(
        [1],
        {
          format: 'json',
          compress: true,
          encrypt: true,
          encryptionKey,
        },
        'full-protection',
        'admin'
      );

      expect(exportResult.success).toBe(true);
      expect(exportResult.filePath).toContain('.gz');
      expect(exportResult.filePath).toContain('.enc');

      const importResult = await service.importConfigurations(
        exportResult.filePath!,
        {
          format: 'json',
          decryptionKey: encryptionKey,
          overwrite: true,
          skipValidation: true,
        },
        'admin'
      );

      expect(importResult.success).toBe(true);

      await fs.unlink(exportResult.filePath!);
    });

    it('should fail import with wrong decryption key', async () => {
      const correctKey = 'correct-key-789';
      const wrongKey = 'wrong-key-000';

      const exportResult = await service.exportConfigurations(
        [1],
        {
          format: 'json',
          encrypt: true,
          encryptionKey: correctKey,
        },
        'encrypted-test',
        'admin'
      );

      expect(exportResult.success).toBe(true);

      const importResult = await service.importConfigurations(
        exportResult.filePath!,
        {
          format: 'json',
          decryptionKey: wrongKey,
        },
        'admin'
      );

      expect(importResult.success).toBe(false);

      await fs.unlink(exportResult.filePath!);
    });
  });

  describe('Backup and Restore Workflow', () => {
    it('should create and restore backup', async () => {
      // Create backup
      const backupResult = await service.createBackup(
        'integration-test-backup',
        'Test backup for integration testing',
        'admin'
      );

      expect(backupResult.success).toBe(true);
      expect(backupResult.filePath).toBeDefined();

      // List backups
      const backups = await service.listBackups();
      const createdBackup = backups.find((b) => b.name === 'integration-test-backup');
      expect(createdBackup).toBeDefined();

      // Restore backup
      const restoreResult = await service.restoreFromBackup(
        backupResult.filePath!,
        {
          overwrite: true,
          skipValidation: true,
        },
        'admin'
      );

      expect(restoreResult.success).toBe(true);

      // Delete backup
      const deleteResult = await service.deleteBackup(createdBackup!.id);
      expect(deleteResult).toBe(true);
    });

    it('should create encrypted backup and restore with key', async () => {
      const encryptionKey = 'backup-key-secure';

      const backupResult = await service.createBackup(
        'secure-backup',
        'Encrypted backup test',
        'admin',
        {
          encrypt: true,
          encryptionKey,
        }
      );

      expect(backupResult.success).toBe(true);

      const restoreResult = await service.restoreFromBackup(
        backupResult.filePath!,
        {
          decryptionKey: encryptionKey,
          overwrite: true,
          skipValidation: true,
        },
        'admin'
      );

      expect(restoreResult.success).toBe(true);

      // Cleanup
      const backups = await service.listBackups();
      const backup = backups.find((b) => b.name === 'secure-backup');
      if (backup) {
        await service.deleteBackup(backup.id);
      }
    });

    it('should enforce backup retention policy', async () => {
      // Set low retention limit
      (UserConfigStore.getInstance as jest.Mock).mockReturnValue({
        getGeneralSettings: jest.fn().mockReturnValue({
          backupRetentionLimit: 2,
          enableColdStorage: false,
        }),
      });

      // Create multiple backups
      const backup1 = await service.createBackup('backup-1', undefined, 'admin');
      await new Promise((resolve) => setTimeout(resolve, 100));

      const backup2 = await service.createBackup('backup-2', undefined, 'admin');
      await new Promise((resolve) => setTimeout(resolve, 100));

      const backup3 = await service.createBackup('backup-3', undefined, 'admin');

      // Check that only 2 backups remain
      const backups = await service.listBackups();
      expect(backups.length).toBeLessThanOrEqual(2);

      // Cleanup remaining backups
      for (const backup of backups) {
        await service.deleteBackup(backup.id);
      }
    });

    it('should validate backup metadata', async () => {
      const backupResult = await service.createBackup(
        'metadata-test',
        'Testing metadata',
        'admin'
      );

      expect(backupResult.success).toBe(true);

      const backups = await service.listBackups();
      const backup = backups.find((b) => b.name === 'metadata-test');

      expect(backup).toBeDefined();
      expect(backup?.createdBy).toBe('admin');
      expect(backup?.description).toBe('Testing metadata');
      expect(backup?.compressed).toBe(true);
      expect(backup?.encrypted).toBe(false);
      expect(backup?.checksum).toBeDefined();
      expect(backup?.size).toBeGreaterThan(0);

      await service.deleteBackup(backup!.id);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle export with no configurations', async () => {
      mockDbManager.getBotConfiguration.mockResolvedValue(null);

      const result = await service.exportConfigurations(
        [999],
        {
          format: 'json',
        },
        'empty-export',
        'admin'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('No configurations found');
    });

    it('should handle import of corrupted file', async () => {
      const corruptedFile = path.join(testDir, 'corrupted.json');
      await fs.writeFile(corruptedFile, '{ invalid json }');

      const result = await service.importConfigurations(
        corruptedFile,
        {
          format: 'json',
        },
        'admin'
      );

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();

      await fs.unlink(corruptedFile);
    });

    it('should handle import of file with invalid structure', async () => {
      const invalidFile = path.join(testDir, 'invalid.json');
      await fs.writeFile(invalidFile, JSON.stringify({ invalid: 'structure' }));

      const result = await service.importConfigurations(
        invalidFile,
        {
          format: 'json',
        },
        'admin'
      );

      expect(result.success).toBe(false);

      await fs.unlink(invalidFile);
    });

    it('should handle missing decryption key for encrypted file', async () => {
      const exportResult = await service.exportConfigurations(
        [1],
        {
          format: 'json',
          encrypt: true,
          encryptionKey: 'secret-key',
        },
        'encrypted-no-key',
        'admin'
      );

      const importResult = await service.importConfigurations(
        exportResult.filePath!,
        {
          format: 'json',
          // No decryption key provided
        },
        'admin'
      );

      expect(importResult.success).toBe(false);
      expect(importResult.errors?.[0]).toContain('Decryption key is required');

      await fs.unlink(exportResult.filePath!);
    });

    it('should handle non-existent import file', async () => {
      const result = await service.importConfigurations(
        '/nonexistent/path/to/file.json',
        {
          format: 'json',
        },
        'admin'
      );

      expect(result.success).toBe(false);
    });

    it('should handle restore of non-existent backup', async () => {
      const result = await service.restoreFromBackup(
        '/nonexistent/backup.json.gz',
        {},
        'admin'
      );

      expect(result.success).toBe(false);
    });
  });

  describe('Data Integrity', () => {
    it('should preserve all configuration data through export/import', async () => {
      const complexConfig = {
        id: 1,
        name: 'Complex Config',
        messageProvider: 'discord',
        llmProvider: 'openai',
        discord: {
          token: 'test-token',
          clientId: 'client-123',
        },
        openai: {
          apiKey: 'sk-test',
          model: 'gpt-4',
        },
        metadata: {
          createdAt: new Date().toISOString(),
          version: '1.0.0',
        },
      };

      mockDbManager.getBotConfiguration.mockResolvedValue(complexConfig);

      const exportResult = await service.exportConfigurations(
        [1],
        {
          format: 'json',
        },
        'integrity-test',
        'admin'
      );

      expect(exportResult.success).toBe(true);

      // Read exported file
      const exportedData = JSON.parse(await fs.readFile(exportResult.filePath!, 'utf-8'));

      expect(exportedData.configurations[0]).toMatchObject({
        name: complexConfig.name,
        messageProvider: complexConfig.messageProvider,
      });

      await fs.unlink(exportResult.filePath!);
    });

    it('should verify checksum after export', async () => {
      const exportResult = await service.exportConfigurations(
        [1, 2],
        {
          format: 'json',
        },
        'checksum-test',
        'admin'
      );

      expect(exportResult.success).toBe(true);
      expect(exportResult.checksum).toBeDefined();
      expect(exportResult.checksum).toHaveLength(64); // SHA-256 hex length

      await fs.unlink(exportResult.filePath!);
    });

    it('should maintain metadata through backup/restore cycle', async () => {
      const backupResult = await service.createBackup(
        'metadata-integrity',
        'Testing metadata integrity',
        'test-admin'
      );

      expect(backupResult.success).toBe(true);

      const backups = await service.listBackups();
      const backup = backups.find((b) => b.name === 'metadata-integrity');

      expect(backup).toMatchObject({
        name: 'metadata-integrity',
        description: 'Testing metadata integrity',
        createdBy: 'test-admin',
      });

      await service.deleteBackup(backup!.id);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent exports', async () => {
      const exports = await Promise.all([
        service.exportConfigurations([1], { format: 'json' }, 'export-1', 'admin'),
        service.exportConfigurations([2], { format: 'json' }, 'export-2', 'admin'),
        service.exportConfigurations([1, 2], { format: 'json' }, 'export-3', 'admin'),
      ]);

      expect(exports.every((e) => e.success)).toBe(true);
      expect(new Set(exports.map((e) => e.filePath)).size).toBe(3); // All unique

      // Cleanup
      for (const exp of exports) {
        if (exp.filePath) {
          await fs.unlink(exp.filePath);
        }
      }
    });

    it('should handle concurrent backups', async () => {
      const backups = await Promise.all([
        service.createBackup('concurrent-1', undefined, 'admin'),
        service.createBackup('concurrent-2', undefined, 'admin'),
        service.createBackup('concurrent-3', undefined, 'admin'),
      ]);

      expect(backups.every((b) => b.success)).toBe(true);

      const allBackups = await service.listBackups();
      const createdBackups = allBackups.filter((b) => b.name.startsWith('concurrent-'));

      expect(createdBackups.length).toBeGreaterThanOrEqual(3);

      // Cleanup
      for (const backup of createdBackups) {
        await service.deleteBackup(backup.id);
      }
    });
  });

  describe('File Path Security', () => {
    it('should sanitize backup names', async () => {
      const dangerousName = '../../../etc/passwd';

      const result = await service.createBackup(dangerousName, undefined, 'admin');

      expect(result.success).toBe(true);
      expect(result.filePath).not.toContain('../');
      expect(result.filePath).toContain('config/backups');

      const backups = await service.listBackups();
      const backup = backups.find((b) => b.name === dangerousName);
      if (backup) {
        await service.deleteBackup(backup.id);
      }
    });

    it('should validate backup file paths', async () => {
      const backupPath = await service.getBackupFilePath('nonexistent');
      expect(backupPath).toBeNull();
    });
  });
});
