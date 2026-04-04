/**
 * API Test Suite for Backup and Export Endpoints
 *
 * Comprehensive tests for configuration backup, export, and restore operations
 *
 * @file backup-export-endpoints.test.ts
 * @author Open-Hivemind API Test Suite
 * @since 2026-04-02
 */

import fs from 'fs/promises';
import path from 'path';
import express from 'express';
import request from 'supertest';
import type { AuthMiddlewareRequest } from '../../src/auth/types';
import importExportRouter from '../../src/server/routes/importExport';
import { ConfigurationImportExportService } from '../../src/server/services/ConfigurationImportExportService';

// Mock dependencies
jest.mock('fs/promises');
jest.mock('../../src/server/services/ConfigurationImportExportService');

jest.mock('../../src/auth/middleware', () => ({
  authenticate: (req: express.Request, res: express.Response, next: express.NextFunction) => {
    (req as AuthMiddlewareRequest).user = {
      id: 'test-user',
      username: 'testuser',
      email: 'test@example.com',
      role: 'user',
      isActive: true,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
    };
    next();
  },
  requireAdmin: (req: express.Request, res: express.Response, next: express.NextFunction) => {
    (req as AuthMiddlewareRequest).user = {
      id: 'admin-user',
      username: 'admin',
      email: 'admin@example.com',
      role: 'admin',
      isActive: true,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
    };
    next();
  },
}));

jest.mock('../../src/middleware/rateLimiter', () => ({
  configLimiter: (req: express.Request, res: express.Response, next: express.NextFunction) => {
    next();
  },
}));

describe('Backup and Export API Endpoints - Comprehensive Test Suite', () => {
  let app: express.Application;
  let mockService: jest.Mocked<ConfigurationImportExportService>;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/import-export', importExportRouter);
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup service mock
    mockService = {
      exportConfigurations: jest.fn(),
      importConfigurations: jest.fn(),
      createBackup: jest.fn(),
      listBackups: jest.fn(),
      restoreFromBackup: jest.fn(),
      deleteBackup: jest.fn(),
      getBackupFilePath: jest.fn(),
    } as any;

    (ConfigurationImportExportService.getInstance as jest.Mock).mockReturnValue(mockService);

    // Mock fs operations
    (fs.unlink as jest.Mock).mockResolvedValue(undefined);
    (fs.access as jest.Mock).mockResolvedValue(undefined);
  });

  describe('POST /api/import-export/export - Export Configuration', () => {
    it('should export configurations in JSON format successfully', async () => {
      mockService.exportConfigurations.mockResolvedValue({
        success: true,
        filePath: '/config/exports/test-export.json',
        size: 2048,
        checksum: 'abc123def456',
      });

      const response = await request(app)
        .post('/api/import-export/export')
        .send({
          configIds: [1, 2, 3],
          format: 'json',
          includeVersions: true,
          includeAuditLogs: true,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.filePath).toBe('/config/exports/test-export.json');
      expect(response.body.data.size).toBe(2048);
      expect(response.body.data.checksum).toBe('abc123def456');
      expect(mockService.exportConfigurations).toHaveBeenCalledWith(
        [1, 2, 3],
        expect.objectContaining({
          format: 'json',
          includeVersions: true,
          includeAuditLogs: true,
        }),
        undefined,
        'admin'
      );
    });

    it('should export configurations in YAML format', async () => {
      mockService.exportConfigurations.mockResolvedValue({
        success: true,
        filePath: '/config/exports/test-export.yaml',
        size: 1536,
        checksum: 'yaml123',
      });

      const response = await request(app)
        .post('/api/import-export/export')
        .send({
          configIds: [1],
          format: 'yaml',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockService.exportConfigurations).toHaveBeenCalledWith(
        [1],
        expect.objectContaining({
          format: 'yaml',
        }),
        undefined,
        'admin'
      );
    });

    it('should export configurations in CSV format', async () => {
      mockService.exportConfigurations.mockResolvedValue({
        success: true,
        filePath: '/config/exports/test-export.csv',
        size: 1024,
        checksum: 'csv789',
      });

      const response = await request(app)
        .post('/api/import-export/export')
        .send({
          configIds: [1, 2],
          format: 'csv',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should support encrypted export with encryption key', async () => {
      mockService.exportConfigurations.mockResolvedValue({
        success: true,
        filePath: '/config/exports/encrypted-export.json.enc',
        size: 3072,
        checksum: 'enc123',
      });

      const response = await request(app)
        .post('/api/import-export/export')
        .send({
          configIds: [1, 2, 3],
          format: 'json',
          encrypt: true,
          encryptionKey: 'strongpassword123',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockService.exportConfigurations).toHaveBeenCalledWith(
        [1, 2, 3],
        expect.objectContaining({
          encrypt: true,
          encryptionKey: 'strongpassword123',
        }),
        undefined,
        'admin'
      );
    });

    it('should support compressed export', async () => {
      mockService.exportConfigurations.mockResolvedValue({
        success: true,
        filePath: '/config/exports/compressed-export.json.gz',
        size: 512,
        checksum: 'gz456',
      });

      const response = await request(app)
        .post('/api/import-export/export')
        .send({
          configIds: [1],
          format: 'json',
          compress: true,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should support custom file names', async () => {
      mockService.exportConfigurations.mockResolvedValue({
        success: true,
        filePath: '/config/exports/custom-export-name.json',
        size: 1024,
        checksum: 'custom123',
      });

      const response = await request(app)
        .post('/api/import-export/export')
        .send({
          configIds: [1],
          fileName: 'custom-export-name',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockService.exportConfigurations).toHaveBeenCalledWith(
        [1],
        expect.anything(),
        'custom-export-name',
        'admin'
      );
    });

    it('should validate configIds is required', async () => {
      const response = await request(app)
        .post('/api/import-export/export')
        .send({
          format: 'json',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });

    it('should validate configIds must be positive numbers', async () => {
      const response = await request(app)
        .post('/api/import-export/export')
        .send({
          configIds: [1, -2, 0],
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should validate format must be json, yaml, or csv', async () => {
      const response = await request(app)
        .post('/api/import-export/export')
        .send({
          configIds: [1],
          format: 'xml',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should validate encryption key length when encryption is enabled', async () => {
      const response = await request(app)
        .post('/api/import-export/export')
        .send({
          configIds: [1],
          encrypt: true,
          encryptionKey: 'short',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should validate fileName format (alphanumeric, underscore, hyphen only)', async () => {
      const response = await request(app)
        .post('/api/import-export/export')
        .send({
          configIds: [1],
          fileName: 'invalid file name!@#',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should validate fileName length (max 100 characters)', async () => {
      const response = await request(app)
        .post('/api/import-export/export')
        .send({
          configIds: [1],
          fileName: 'a'.repeat(101),
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle export service failure', async () => {
      mockService.exportConfigurations.mockResolvedValue({
        success: false,
        error: 'No configurations found',
      });

      const response = await request(app)
        .post('/api/import-export/export')
        .send({
          configIds: [999],
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('No configurations found');
    });

    it('should handle unexpected service errors', async () => {
      mockService.exportConfigurations.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .post('/api/import-export/export')
        .send({
          configIds: [1],
        })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Database connection failed');
    });

    it('should support selective export with includeTemplates option', async () => {
      mockService.exportConfigurations.mockResolvedValue({
        success: true,
        filePath: '/config/exports/with-templates.json',
        size: 4096,
        checksum: 'tmpl123',
      });

      const response = await request(app)
        .post('/api/import-export/export')
        .send({
          configIds: [1],
          includeTemplates: true,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockService.exportConfigurations).toHaveBeenCalledWith(
        [1],
        expect.objectContaining({
          includeTemplates: true,
        }),
        undefined,
        'admin'
      );
    });
  });

  describe('POST /api/import-export/backup - Create Backup', () => {
    it('should create a full backup successfully', async () => {
      mockService.createBackup.mockResolvedValue({
        success: true,
        filePath: '/config/backups/daily-backup.json.gz',
        size: 8192,
        checksum: 'backup123',
      });

      const response = await request(app)
        .post('/api/import-export/backup')
        .send({
          name: 'daily-backup',
          description: 'Daily automated backup',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.filePath).toBe('/config/backups/daily-backup.json.gz');
      expect(response.body.data.size).toBe(8192);
      expect(mockService.createBackup).toHaveBeenCalledWith(
        'daily-backup',
        'Daily automated backup',
        'admin',
        expect.objectContaining({
          format: 'json',
          includeVersions: true,
          includeAuditLogs: true,
          includeTemplates: true,
          compress: true,
          encrypt: false,
        })
      );
    });

    it('should create encrypted backup with encryption key', async () => {
      mockService.createBackup.mockResolvedValue({
        success: true,
        filePath: '/config/backups/secure-backup.json.gz.enc',
        size: 10240,
        checksum: 'encrypted123',
      });

      const response = await request(app)
        .post('/api/import-export/backup')
        .send({
          name: 'secure-backup',
          description: 'Encrypted backup',
          encrypt: true,
          encryptionKey: 'securepassword123',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockService.createBackup).toHaveBeenCalledWith(
        'secure-backup',
        'Encrypted backup',
        'admin',
        expect.objectContaining({
          encrypt: true,
          encryptionKey: 'securepassword123',
        })
      );
    });

    it('should validate backup name is required', async () => {
      const response = await request(app)
        .post('/api/import-export/backup')
        .send({
          description: 'Missing name',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should validate backup name format (alphanumeric, underscore, hyphen only)', async () => {
      const response = await request(app)
        .post('/api/import-export/backup')
        .send({
          name: 'invalid backup!@#',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should validate backup name length (max 100 characters)', async () => {
      const response = await request(app)
        .post('/api/import-export/backup')
        .send({
          name: 'a'.repeat(101),
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should validate description length (max 500 characters)', async () => {
      const response = await request(app)
        .post('/api/import-export/backup')
        .send({
          name: 'test-backup',
          description: 'a'.repeat(501),
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should validate encryption key length when encryption is enabled', async () => {
      const response = await request(app)
        .post('/api/import-export/backup')
        .send({
          name: 'test-backup',
          encrypt: true,
          encryptionKey: 'short',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle backup creation failure', async () => {
      mockService.createBackup.mockResolvedValue({
        success: false,
        error: 'Insufficient disk space',
      });

      const response = await request(app)
        .post('/api/import-export/backup')
        .send({
          name: 'failed-backup',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Insufficient disk space');
    });

    it('should handle unexpected backup errors', async () => {
      mockService.createBackup.mockRejectedValue(new Error('File system error'));

      const response = await request(app)
        .post('/api/import-export/backup')
        .send({
          name: 'error-backup',
        })
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    it('should support backup without compression', async () => {
      mockService.createBackup.mockResolvedValue({
        success: true,
        filePath: '/config/backups/uncompressed-backup.json',
        size: 16384,
        checksum: 'uncompressed123',
      });

      const response = await request(app)
        .post('/api/import-export/backup')
        .send({
          name: 'uncompressed-backup',
          compress: false,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/import-export/backups - List Backups', () => {
    it('should list all available backups', async () => {
      const mockBackups = [
        {
          id: 'backup-1',
          name: 'daily-backup-2026-04-01',
          createdAt: new Date('2026-04-01'),
          createdBy: 'admin',
          size: 8192,
          checksum: 'abc123',
          encrypted: false,
          compressed: true,
        },
        {
          id: 'backup-2',
          name: 'weekly-backup-2026-03-25',
          createdAt: new Date('2026-03-25'),
          createdBy: 'admin',
          size: 12288,
          checksum: 'def456',
          encrypted: true,
          compressed: true,
        },
      ];

      mockService.listBackups.mockResolvedValue(mockBackups as any);

      const response = await request(app).get('/api/import-export/backups').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockBackups);
      expect(response.body.count).toBe(2);
    });

    it('should return empty array when no backups exist', async () => {
      mockService.listBackups.mockResolvedValue([]);

      const response = await request(app).get('/api/import-export/backups').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
      expect(response.body.count).toBe(0);
    });

    it('should handle listing errors gracefully', async () => {
      mockService.listBackups.mockRejectedValue(new Error('Directory not accessible'));

      const response = await request(app).get('/api/import-export/backups').expect(500);

      expect(response.body.success).toBe(false);
    });

    it('should show encrypted status in backup list', async () => {
      const mockBackups = [
        {
          id: 'encrypted-backup',
          name: 'secure-backup',
          createdAt: new Date(),
          createdBy: 'admin',
          size: 10240,
          checksum: 'enc123',
          encrypted: true,
          compressed: true,
        },
      ];

      mockService.listBackups.mockResolvedValue(mockBackups as any);

      const response = await request(app).get('/api/import-export/backups').expect(200);

      expect(response.body.data[0].encrypted).toBe(true);
    });
  });

  describe('POST /api/import-export/backups/:backupId/restore - Restore Backup', () => {
    it('should restore from backup successfully', async () => {
      mockService.getBackupFilePath.mockResolvedValue('/config/backups/backup-123.json.gz');
      mockService.restoreFromBackup.mockResolvedValue({
        success: true,
        importedCount: 15,
        skippedCount: 0,
        errorCount: 0,
        errors: [],
      });

      const response = await request(app)
        .post('/api/import-export/backups/backup-123/restore')
        .send({
          overwrite: true,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.success).toBe(true);
      expect(response.body.data.importedCount).toBe(15);
      expect(mockService.getBackupFilePath).toHaveBeenCalledWith('backup-123');
      expect(mockService.restoreFromBackup).toHaveBeenCalledWith(
        '/config/backups/backup-123.json.gz',
        expect.objectContaining({
          overwrite: true,
        }),
        'admin'
      );
    });

    it('should support validate-only mode without restoring', async () => {
      mockService.getBackupFilePath.mockResolvedValue('/config/backups/backup-123.json.gz');
      mockService.restoreFromBackup.mockResolvedValue({
        success: true,
        importedCount: 0,
        skippedCount: 0,
        errorCount: 0,
        errors: [],
      });

      const response = await request(app)
        .post('/api/import-export/backups/backup-123/restore')
        .send({
          validateOnly: true,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockService.restoreFromBackup).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          validateOnly: true,
        }),
        'admin'
      );
    });

    it('should restore encrypted backup with decryption key', async () => {
      mockService.getBackupFilePath.mockResolvedValue('/config/backups/encrypted.json.gz.enc');
      mockService.restoreFromBackup.mockResolvedValue({
        success: true,
        importedCount: 10,
        skippedCount: 0,
        errorCount: 0,
        errors: [],
      });

      const response = await request(app)
        .post('/api/import-export/backups/encrypted-backup/restore')
        .send({
          decryptionKey: 'securepassword123',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockService.restoreFromBackup).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          decryptionKey: 'securepassword123',
        }),
        'admin'
      );
    });

    it('should validate backupId format', async () => {
      const response = await request(app)
        .post('/api/import-export/backups/invalid@backup!id/restore')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 when backup not found', async () => {
      mockService.getBackupFilePath.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/import-export/backups/non-existent/restore')
        .send({})
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Backup not found or invalid');
    });

    it('should validate decryption key length (min 8 characters)', async () => {
      const response = await request(app)
        .post('/api/import-export/backups/backup-123/restore')
        .send({
          decryptionKey: 'short',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle restore errors', async () => {
      mockService.getBackupFilePath.mockResolvedValue('/config/backups/backup-123.json.gz');
      mockService.restoreFromBackup.mockRejectedValue(new Error('Corrupted backup file'));

      const response = await request(app)
        .post('/api/import-export/backups/backup-123/restore')
        .send({})
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    it('should support skipValidation option', async () => {
      mockService.getBackupFilePath.mockResolvedValue('/config/backups/backup-123.json.gz');
      mockService.restoreFromBackup.mockResolvedValue({
        success: true,
        importedCount: 5,
        skippedCount: 0,
        errorCount: 0,
        errors: [],
      });

      const response = await request(app)
        .post('/api/import-export/backups/backup-123/restore')
        .send({
          skipValidation: true,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockService.restoreFromBackup).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          skipValidation: true,
        }),
        'admin'
      );
    });

    it('should report partial restore results', async () => {
      mockService.getBackupFilePath.mockResolvedValue('/config/backups/backup-123.json.gz');
      mockService.restoreFromBackup.mockResolvedValue({
        success: true,
        importedCount: 8,
        skippedCount: 2,
        errorCount: 1,
        errors: ['Configuration ID 5 already exists'],
      });

      const response = await request(app)
        .post('/api/import-export/backups/backup-123/restore')
        .send({
          overwrite: false,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.importedCount).toBe(8);
      expect(response.body.data.skippedCount).toBe(2);
      expect(response.body.data.errorCount).toBe(1);
    });
  });

  describe('DELETE /api/import-export/backups/:backupId - Delete Backup', () => {
    it('should delete backup successfully', async () => {
      mockService.deleteBackup.mockResolvedValue(true);

      const response = await request(app)
        .delete('/api/import-export/backups/backup-123')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockService.deleteBackup).toHaveBeenCalledWith('backup-123');
    });

    it('should return 404 when backup not found', async () => {
      mockService.deleteBackup.mockResolvedValue(false);

      const response = await request(app)
        .delete('/api/import-export/backups/non-existent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Backup not found');
    });

    it('should handle delete errors', async () => {
      mockService.deleteBackup.mockRejectedValue(new Error('File system error'));

      const response = await request(app)
        .delete('/api/import-export/backups/backup-123')
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/import-export/backups/:backupId/download - Download Backup', () => {
    it('should download backup file successfully', async () => {
      const mockBackupPath = '/config/backups/backup-123.json.gz';
      mockService.getBackupFilePath.mockResolvedValue(mockBackupPath);
      (fs.access as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app)
        .get('/api/import-export/backups/backup-123/download')
        .expect(200);

      expect(mockService.getBackupFilePath).toHaveBeenCalledWith('backup-123');
    });

    it('should return 404 when backup path not found', async () => {
      mockService.getBackupFilePath.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/import-export/backups/non-existent/download')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Backup not found or invalid');
    });

    it('should return 404 when backup file does not exist on disk', async () => {
      mockService.getBackupFilePath.mockResolvedValue('/config/backups/missing.json.gz');
      (fs.access as jest.Mock).mockRejectedValue(new Error('ENOENT: no such file'));

      const response = await request(app)
        .get('/api/import-export/backups/backup-123/download')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Backup file not found');
    });

    it('should handle download errors', async () => {
      mockService.getBackupFilePath.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/import-export/backups/backup-123/download')
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/import-export/import - Import Configuration', () => {
    it('should import configurations from uploaded file', async () => {
      mockService.importConfigurations.mockResolvedValue({
        success: true,
        importedCount: 5,
        skippedCount: 0,
        errorCount: 0,
        errors: [],
      });

      const response = await request(app)
        .post('/api/import-export/import')
        .attach('file', Buffer.from(JSON.stringify({ configurations: [] })), 'import.json')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.success).toBe(true);
      expect(response.body.data.importedCount).toBe(5);
      expect(mockService.importConfigurations).toHaveBeenCalled();
      expect(fs.unlink).toHaveBeenCalled();
    });

    it('should return 400 when no file uploaded', async () => {
      const response = await request(app).post('/api/import-export/import').send({}).expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('No file uploaded');
    });

    it('should reject invalid file types', async () => {
      const response = await request(app)
        .post('/api/import-export/import')
        .attach('file', Buffer.from('content'), 'malicious.exe')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject files exceeding size limit (50MB)', async () => {
      const largeBuffer = Buffer.alloc(60 * 1024 * 1024); // 60MB

      const response = await request(app)
        .post('/api/import-export/import')
        .attach('file', largeBuffer, 'large.json')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should clean up uploaded file after successful import', async () => {
      mockService.importConfigurations.mockResolvedValue({
        success: true,
        importedCount: 3,
        skippedCount: 0,
        errorCount: 0,
        errors: [],
      });

      await request(app)
        .post('/api/import-export/import')
        .attach('file', Buffer.from('{}'), 'config.json')
        .expect(200);

      expect(fs.unlink).toHaveBeenCalled();
    });

    it('should clean up uploaded file on import error', async () => {
      mockService.importConfigurations.mockRejectedValue(new Error('Invalid format'));

      await request(app)
        .post('/api/import-export/import')
        .attach('file', Buffer.from('{}'), 'config.json')
        .expect(500);

      expect(fs.unlink).toHaveBeenCalled();
    });

    it('should support encrypted files with decryption key', async () => {
      mockService.importConfigurations.mockResolvedValue({
        success: true,
        importedCount: 2,
        skippedCount: 0,
        errorCount: 0,
        errors: [],
      });

      const response = await request(app)
        .post('/api/import-export/import')
        .attach('file', Buffer.from('encrypted-data'), 'config.json.enc')
        .field('decryptionKey', 'securepassword123')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should validate decryption key length', async () => {
      const response = await request(app)
        .post('/api/import-export/import')
        .attach('file', Buffer.from('data'), 'config.json')
        .field('decryptionKey', 'short')
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/import-export/validate - Validate Configuration', () => {
    it('should validate configuration file without importing', async () => {
      mockService.importConfigurations.mockResolvedValue({
        success: true,
        importedCount: 0,
        skippedCount: 0,
        errorCount: 0,
        errors: [],
      });

      const response = await request(app)
        .post('/api/import-export/validate')
        .attach('file', Buffer.from(JSON.stringify({ configurations: [] })), 'config.json')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockService.importConfigurations).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          validateOnly: true,
          skipValidation: false,
        })
      );
      expect(fs.unlink).toHaveBeenCalled();
    });

    it('should return validation errors', async () => {
      mockService.importConfigurations.mockResolvedValue({
        success: true,
        importedCount: 0,
        skippedCount: 0,
        errorCount: 2,
        errors: ['Missing required field: name', 'Invalid format'],
      });

      const response = await request(app)
        .post('/api/import-export/validate')
        .attach('file', Buffer.from('{}'), 'config.json')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.errorCount).toBe(2);
      expect(response.body.data.errors).toHaveLength(2);
    });

    it('should return 400 when no file uploaded', async () => {
      const response = await request(app).post('/api/import-export/validate').send({}).expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('No file uploaded');
    });

    it('should clean up uploaded file after validation', async () => {
      mockService.importConfigurations.mockResolvedValue({
        success: true,
        importedCount: 0,
        skippedCount: 0,
        errorCount: 0,
        errors: [],
      });

      await request(app)
        .post('/api/import-export/validate')
        .attach('file', Buffer.from('{}'), 'config.json')
        .expect(200);

      expect(fs.unlink).toHaveBeenCalled();
    });

    it('should clean up on validation error', async () => {
      mockService.importConfigurations.mockRejectedValue(new Error('Validation failed'));

      await request(app)
        .post('/api/import-export/validate')
        .attach('file', Buffer.from('{}'), 'config.json')
        .expect(500);

      expect(fs.unlink).toHaveBeenCalled();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle corrupted backup files gracefully', async () => {
      mockService.getBackupFilePath.mockResolvedValue('/config/backups/corrupted.json.gz');
      mockService.restoreFromBackup.mockRejectedValue(new Error('Corrupted or invalid backup'));

      const response = await request(app)
        .post('/api/import-export/backups/corrupted/restore')
        .send({})
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    it('should handle malformed JSON in request body', async () => {
      await request(app)
        .post('/api/import-export/export')
        .set('Content-Type', 'application/json')
        .send('{invalid json}')
        .expect(400);
    });

    it('should handle concurrent backup operations', async () => {
      mockService.createBackup.mockResolvedValue({
        success: true,
        filePath: '/config/backups/concurrent-backup.json.gz',
        size: 4096,
        checksum: 'concurrent123',
      });

      const requests = Array(5)
        .fill(null)
        .map((_, i) =>
          request(app)
            .post('/api/import-export/backup')
            .send({
              name: `concurrent-backup-${i}`,
            })
        );

      const responses = await Promise.all(requests);

      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    it('should handle empty configIds array', async () => {
      const response = await request(app)
        .post('/api/import-export/export')
        .send({
          configIds: [],
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle invalid JSON in uploaded file during import', async () => {
      mockService.importConfigurations.mockRejectedValue(new Error('Invalid JSON format'));

      const response = await request(app)
        .post('/api/import-export/import')
        .attach('file', Buffer.from('not valid json'), 'config.json')
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    it('should handle filesystem cleanup errors gracefully', async () => {
      mockService.importConfigurations.mockResolvedValue({
        success: true,
        importedCount: 1,
        skippedCount: 0,
        errorCount: 0,
        errors: [],
      });
      (fs.unlink as jest.Mock).mockRejectedValue(new Error('Permission denied'));

      const response = await request(app)
        .post('/api/import-export/import')
        .attach('file', Buffer.from('{}'), 'config.json')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Authorization and Access Control', () => {
    it('should require admin role for export endpoint', async () => {
      mockService.exportConfigurations.mockResolvedValue({
        success: true,
        filePath: '/config/exports/export.json',
        size: 1024,
        checksum: 'auth123',
      });

      const response = await request(app)
        .post('/api/import-export/export')
        .send({
          configIds: [1],
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should require admin role for backup creation', async () => {
      mockService.createBackup.mockResolvedValue({
        success: true,
        filePath: '/config/backups/backup.json.gz',
        size: 2048,
        checksum: 'backup123',
      });

      const response = await request(app)
        .post('/api/import-export/backup')
        .send({
          name: 'admin-backup',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should require admin role for restore operation', async () => {
      mockService.getBackupFilePath.mockResolvedValue('/config/backups/backup-123.json.gz');
      mockService.restoreFromBackup.mockResolvedValue({
        success: true,
        importedCount: 5,
        skippedCount: 0,
        errorCount: 0,
        errors: [],
      });

      const response = await request(app)
        .post('/api/import-export/backups/backup-123/restore')
        .send({})
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should require admin role for backup deletion', async () => {
      mockService.deleteBackup.mockResolvedValue(true);

      const response = await request(app)
        .delete('/api/import-export/backups/backup-123')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});
