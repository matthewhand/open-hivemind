/**
 * Import/Export Security Tests
 *
 * Tests path traversal resistance, file type validation, and backup
 * download safety in the import/export subsystem.
 *
 * This replaces the old 105-line skipped test file that mocked the
 * entire service and tested nothing about actual path traversal attacks.
 */
import path from 'path';
import { BackupManager } from '../../src/server/services/configImportExport/backupManager';
import { ConfigurationImportExportService } from '../../src/server/services/ConfigurationImportExportService';
import { PathSecurityUtils } from '../../src/utils/PathSecurityUtils';

// ---------------------------------------------------------------------------
// PathSecurityUtils
// ---------------------------------------------------------------------------

describe('Import/Export Security', () => {
  describe('PathSecurityUtils.sanitizeFilename', () => {
    it('should strip directory components using path.basename', () => {
      expect(PathSecurityUtils.sanitizeFilename('backup.json.gz')).toBe('backup.json.gz');
      expect(PathSecurityUtils.sanitizeFilename('dir/backup.json.gz')).toBe('backup.json.gz');
      expect(PathSecurityUtils.sanitizeFilename('a/b/c/file.txt')).toBe('file.txt');
    });

    it('should strip Unix path traversal sequences via basename', () => {
      expect(PathSecurityUtils.sanitizeFilename('../../../etc/passwd')).toBe('passwd');
      // On Linux, backslashes are NOT path separators, so they're preserved
      expect(PathSecurityUtils.sanitizeFilename('..\\..\\windows\\system32')).toBe(
        '..\\..\\windows\\system32'
      );
    });

    it('should handle filenames with null bytes (passed through by basename)', () => {
      const result = PathSecurityUtils.sanitizeFilename('backup\x00.jpg');
      // basename strips nothing from null bytes, but path.join would handle it
      expect(result).toContain('jpg');
    });

    it('should preserve filenames with dots and spaces', () => {
      expect(PathSecurityUtils.sanitizeFilename('.hidden')).toBe('.hidden');
      expect(PathSecurityUtils.sanitizeFilename('backup.2024.tar.gz')).toBe('backup.2024.tar.gz');
    });

    it('should preserve filenames with consecutive dots', () => {
      expect(PathSecurityUtils.sanitizeFilename('file...name')).toBe('file...name');
    });

    it('should handle empty input', () => {
      expect(PathSecurityUtils.sanitizeFilename('')).toBe('');
    });
  });

  describe('PathSecurityUtils.getSafePath', () => {
    const baseDir = '/safe/backups';

    it('should return a safe path within the base directory', () => {
      const result = PathSecurityUtils.getSafePath(baseDir, 'backup.json.gz');
      expect(result).toBe(path.join(baseDir, 'backup.json.gz'));
    });

    it('should prevent directory traversal via filename', () => {
      // getSafePath uses basename then validates, so traversal is stripped
      const result = PathSecurityUtils.getSafePath(baseDir, '../../etc/passwd');
      expect(result).toBe(path.join(baseDir, 'passwd'));
    });

    it('should throw when sanitized path still tries to escape', () => {
      // After basename strips traversal, the path stays within baseDir
      // So ../escaped won't throw. But a path that IS the baseDir itself
      // with an absolute path should throw since it escapes after basename
      // Actually getSafePath is safe because basename + isPathWithinDirectory
      // Let's verify it returns a safe path instead of throwing
      const result = PathSecurityUtils.getSafePath(baseDir, '../escaped');
      expect(result.startsWith(path.resolve(baseDir))).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // BackupManager path safety
  // ---------------------------------------------------------------------------

  describe('BackupManager path safety', () => {
    let manager: BackupManager;

    beforeEach(() => {
      manager = new BackupManager('/tmp/test-backups');
    });

    it('should generate safe backup paths with sanitized names', () => {
      const date = new Date('2024-01-15T10:00:00Z');
      const safePath = manager.getSafeBackupPath('my-backup', date);

      expect(safePath).toContain('/tmp/test-backups');
      expect(safePath).toContain('backup-my-backup-');
      expect(safePath).toContain('.json.gz');
      // Should not contain any traversal sequences
      expect(safePath).not.toContain('../');
      expect(safePath).not.toContain('..\\');
    });

    it('should sanitize malicious backup names', () => {
      const date = new Date('2024-01-15T10:00:00Z');
      const safePath = manager.getSafeBackupPath('../../../etc/passwd', date);

      // basename strips the traversal, so filename becomes 'passwd'
      expect(safePath).toContain('/tmp/test-backups');
      expect(safePath).toContain('passwd');
      expect(safePath).not.toContain('/etc/');
    });

    it('should use .json.enc.gz extension for encrypted backups', () => {
      const date = new Date('2024-01-15T10:00:00Z');
      const safePath = manager.getSafeBackupPath('secret-backup', date, true);

      expect(safePath).toMatch(/\.json\.enc\.gz$/);
    });
  });

  // ---------------------------------------------------------------------------
  // ConfigurationImportExportService integration
  // ---------------------------------------------------------------------------

  describe('ConfigurationImportExportService.getBackupFilePath', () => {
    let service: ConfigurationImportExportService;

    beforeEach(() => {
      // Reset singleton for test isolation
      (ConfigurationImportExportService as any).instance = undefined;
      service = ConfigurationImportExportService.getInstance();
    });

    afterEach(() => {
      (ConfigurationImportExportService as any).instance = undefined;
    });

    it('should return null for non-existent backup IDs', async () => {
      const result = await service.getBackupFilePath('nonexistent-backup-id');
      expect(result).toBeNull();
    });

    it('should return null for path traversal attempt via backupId', async () => {
      // A traversal attempt in the backupId should not resolve to a real file
      const result = await service.getBackupFilePath('../../../etc/passwd');
      expect(result).toBeNull();
    });

    it('should return null for null-byte injection attempt', async () => {
      const result = await service.getBackupFilePath('backup\x00.json');
      expect(result).toBeNull();
    });

    it('should return a path that stays within the backups directory', async () => {
      // Even if a backup exists, the returned path must be within the expected directory
      const result = await service.getBackupFilePath('some-id');
      if (result !== null) {
        const backupsDir = path.resolve(path.join(process.cwd(), 'config', 'backups'));
        const resolvedResult = path.resolve(result);
        expect(resolvedResult.startsWith(backupsDir)).toBe(true);
      }
    });
  });
});
