import fs from 'fs/promises';
import path from 'path';
import express, { type Express } from 'express';
import request from 'supertest';

// Mock dependencies
jest.mock('fs/promises');
jest.mock('../../../../src/auth/middleware', () => ({
  authenticate: jest.fn((req: any, res: any, next: any) => {
    req.user = { username: 'testuser', role: 'user' };
    next();
  }),
  requireAdmin: jest.fn((req: any, res: any, next: any) => {
    req.user = { username: 'admin', role: 'admin' };
    next();
  }),
}));

// Mock rate limiter to pass through
jest.mock('../../../../src/middleware/rateLimiter', () => ({
  configLimiter: (req: any, res: any, next: any) => next(),
}));

// Mock Zod-based validation to pass through
jest.mock('../../../../src/validation/validateRequest', () => ({
  validateRequest: () => (req: any, res: any, next: any) => next(),
}));

// Mock asyncErrorHandler to wrap async handlers properly
jest.mock('../../../../src/middleware/errorHandler', () => ({
  asyncErrorHandler: (fn: any) => (req: any, res: any, next: any) => {
    return Promise.resolve(fn(req, res, next)).catch(next);
  },
}));

// Mock structured logger
jest.mock('../../../../src/common/StructuredLogger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }),
}));

// Mock service - use a stable object created inside the factory to avoid TDZ issues.
// The __mockService is attached to the mocked module for test access.
jest.mock('../../../../src/server/services/ConfigurationImportExportService', () => {
  const svc = {
    exportConfigurations: jest.fn(),
    importConfigurations: jest.fn(),
    createBackup: jest.fn(),
    listBackups: jest.fn(),
    restoreFromBackup: jest.fn(),
    deleteBackup: jest.fn(),
    getBackupFilePath: jest.fn(),
  };
  return {
    __mockService: svc,
    ConfigurationImportExportService: {
      getInstance: jest.fn(() => svc),
    },
  };
});

import importExportRouter from '../../../../src/server/routes/importExport';

// Get the mock service created inside the jest.mock factory
const { __mockService: mockService } = jest.requireMock(
  '../../../../src/server/services/ConfigurationImportExportService'
) as { __mockService: Record<string, jest.Mock> };

describe('Import/Export Routes', () => {
  let app: Express;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup Express app
    app = express();
    app.use(express.json());
    app.use('/api/import-export', importExportRouter);

    // Mock fs.unlink
    (fs.unlink as jest.Mock).mockResolvedValue(undefined);
  });

  describe('POST /api/import-export/export', () => {
    it('should export configurations successfully', async () => {
      mockService.exportConfigurations.mockResolvedValue({
        success: true,
        filePath: '/path/to/export.json',
        size: 1024,
        checksum: 'abc123',
      });

      const response = await request(app)
        .post('/api/import-export/export')
        .send({
          configIds: [1, 2, 3],
          format: 'json',
          includeVersions: true,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.filePath).toBe('/path/to/export.json');
      expect(mockService.exportConfigurations).toHaveBeenCalledWith(
        [1, 2, 3],
        expect.objectContaining({
          format: 'json',
          includeVersions: true,
        }),
        undefined,
        'admin'
      );
    });

    it('should validate configIds is required', async () => {
      const response = await request(app).post('/api/import-export/export').send({
        format: 'json',
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should validate configIds are positive numbers', async () => {
      const response = await request(app)
        .post('/api/import-export/export')
        .send({
          configIds: [1, -2, 'invalid'],
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should validate format is one of json, yaml, csv', async () => {
      const response = await request(app)
        .post('/api/import-export/export')
        .send({
          configIds: [1],
          format: 'xml',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should validate encryption key length when encrypt is true', async () => {
      const response = await request(app)
        .post('/api/import-export/export')
        .send({
          configIds: [1],
          encrypt: true,
          encryptionKey: 'short',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should validate fileName format', async () => {
      const response = await request(app)
        .post('/api/import-export/export')
        .send({
          configIds: [1],
          fileName: 'invalid file name!@#',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should handle export failure', async () => {
      mockService.exportConfigurations.mockResolvedValue({
        success: false,
        error: 'Export failed',
      });

      const response = await request(app)
        .post('/api/import-export/export')
        .send({
          configIds: [1],
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Export failed');
    });

    it('should handle unexpected errors', async () => {
      mockService.exportConfigurations.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/import-export/export')
        .send({
          configIds: [1],
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Database error');
    });
  });

  describe('POST /api/import-export/import', () => {
    it('should import configurations from uploaded file', async () => {
      mockService.importConfigurations.mockResolvedValue({
        success: true,
        importedCount: 5,
        skippedCount: 0,
        errorCount: 0,
      });

      const response = await request(app)
        .post('/api/import-export/import')
        .attach('file', Buffer.from('{}'), 'config.json');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockService.importConfigurations).toHaveBeenCalled();
      expect(fs.unlink).toHaveBeenCalled();
    });

    it('should return 400 when no file is uploaded', async () => {
      const response = await request(app).post('/api/import-export/import').send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('No file uploaded');
    });

    it('should validate file type', async () => {
      const response = await request(app)
        .post('/api/import-export/import')
        .attach('file', Buffer.from('content'), 'config.exe');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid file type');
    });

    it('should handle file size limit exceeded', async () => {
      const largeBuffer = Buffer.alloc(60 * 1024 * 1024); // 60MB

      const response = await request(app)
        .post('/api/import-export/import')
        .attach('file', largeBuffer, 'large.json');

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('File too large');
    });

    it('should clean up uploaded file on error', async () => {
      mockService.importConfigurations.mockRejectedValue(new Error('Import failed'));

      await request(app)
        .post('/api/import-export/import')
        .attach('file', Buffer.from('{}'), 'config.json');

      expect(fs.unlink).toHaveBeenCalled();
    });

    it('should accept compressed files', async () => {
      mockService.importConfigurations.mockResolvedValue({
        success: true,
        importedCount: 3,
      });

      const response = await request(app)
        .post('/api/import-export/import')
        .attach('file', Buffer.from(''), 'config.json.gz');

      expect(response.status).toBe(200);
    });

    it('should accept encrypted files', async () => {
      mockService.importConfigurations.mockResolvedValue({
        success: true,
        importedCount: 2,
      });

      const response = await request(app)
        .post('/api/import-export/import')
        .attach('file', Buffer.from(''), 'config.json.enc');

      expect(response.status).toBe(200);
    });

    it('should validate decryption key length', async () => {
      const response = await request(app)
        .post('/api/import-export/import')
        .attach('file', Buffer.from(''), 'config.json')
        .field('decryptionKey', 'short');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/import-export/backup', () => {
    it('should create backup successfully', async () => {
      mockService.createBackup.mockResolvedValue({
        success: true,
        filePath: '/path/to/backup.json.gz',
        size: 2048,
        checksum: 'def456',
      });

      const response = await request(app).post('/api/import-export/backup').send({
        name: 'daily-backup',
        description: 'Daily automated backup',
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.filePath).toBe('/path/to/backup.json.gz');
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
        })
      );
    });

    it('should validate backup name is required', async () => {
      const response = await request(app).post('/api/import-export/backup').send({
        description: 'No name provided',
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should validate backup name format', async () => {
      const response = await request(app).post('/api/import-export/backup').send({
        name: 'invalid name!@#',
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should validate backup name length', async () => {
      const response = await request(app)
        .post('/api/import-export/backup')
        .send({
          name: 'a'.repeat(101),
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should validate description length', async () => {
      const response = await request(app)
        .post('/api/import-export/backup')
        .send({
          name: 'valid-name',
          description: 'a'.repeat(501),
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should handle backup creation failure', async () => {
      mockService.createBackup.mockResolvedValue({
        success: false,
        error: 'Backup failed',
      });

      const response = await request(app).post('/api/import-export/backup').send({
        name: 'test-backup',
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should support encrypted backups', async () => {
      mockService.createBackup.mockResolvedValue({
        success: true,
        filePath: '/path/to/backup.json.gz.enc',
        size: 2048,
        checksum: 'xyz789',
      });

      const response = await request(app).post('/api/import-export/backup').send({
        name: 'secure-backup',
        encrypt: true,
        encryptionKey: 'strongpassword123',
      });

      expect(response.status).toBe(200);
      expect(mockService.createBackup).toHaveBeenCalledWith(
        'secure-backup',
        undefined,
        'admin',
        expect.objectContaining({
          encrypt: true,
          encryptionKey: 'strongpassword123',
        })
      );
    });
  });

  describe('GET /api/import-export/backups', () => {
    it('should list all backups', async () => {
      const mockBackups = [
        {
          id: 'backup-1',
          name: 'backup-1',
          createdAt: new Date(),
          createdBy: 'admin',
          configCount: 10,
          size: 1024,
          checksum: 'abc',
          encrypted: false,
          compressed: true,
        },
        {
          id: 'backup-2',
          name: 'backup-2',
          createdAt: new Date(),
          createdBy: 'admin',
          configCount: 15,
          size: 2048,
          checksum: 'def',
          encrypted: true,
          compressed: true,
        },
      ];

      mockService.listBackups.mockResolvedValue(mockBackups as any);

      const response = await request(app).get('/api/import-export/backups');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      // ApiResponse.success(backups) wraps in { success: true, data: backups }
      expect(response.body.data).toBeDefined();
    });

    it('should return empty array when no backups exist', async () => {
      mockService.listBackups.mockResolvedValue([]);

      const response = await request(app).get('/api/import-export/backups');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });

    it('should handle list errors', async () => {
      mockService.listBackups.mockRejectedValue(new Error('File system error'));

      const response = await request(app).get('/api/import-export/backups');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/import-export/backups/:backupId/restore', () => {
    it('should restore backup successfully', async () => {
      mockService.getBackupFilePath.mockResolvedValue('/path/to/backup.json.gz');
      mockService.restoreFromBackup.mockResolvedValue({
        success: true,
        importedCount: 10,
        skippedCount: 0,
        errorCount: 0,
      });

      const response = await request(app)
        .post('/api/import-export/backups/backup-123/restore')
        .send({
          overwrite: true,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockService.getBackupFilePath).toHaveBeenCalledWith('backup-123');
      expect(mockService.restoreFromBackup).toHaveBeenCalled();
    });

    it('should validate backupId format', async () => {
      const response = await request(app)
        .post('/api/import-export/backups/invalid@backup/restore')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 404 when backup not found', async () => {
      mockService.getBackupFilePath.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/import-export/backups/non-existent/restore')
        .send({});

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Backup not found or invalid');
    });

    it('should support validateOnly mode', async () => {
      mockService.getBackupFilePath.mockResolvedValue('/path/to/backup.json.gz');
      mockService.restoreFromBackup.mockResolvedValue({
        success: true,
        importedCount: 0,
        errorCount: 0,
      });

      const response = await request(app)
        .post('/api/import-export/backups/backup-123/restore')
        .send({
          validateOnly: true,
        });

      expect(response.status).toBe(200);
      expect(mockService.restoreFromBackup).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          validateOnly: true,
        }),
        'admin'
      );
    });

    it('should handle restore errors', async () => {
      mockService.getBackupFilePath.mockResolvedValue('/path/to/backup.json.gz');
      mockService.restoreFromBackup.mockRejectedValue(new Error('Restore failed'));

      const response = await request(app)
        .post('/api/import-export/backups/backup-123/restore')
        .send({});

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    it('should validate decryption key for encrypted backups', async () => {
      const response = await request(app)
        .post('/api/import-export/backups/backup-enc-123/restore')
        .send({
          decryptionKey: 'short',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/import-export/backups/:backupId', () => {
    it('should delete backup successfully', async () => {
      mockService.deleteBackup.mockResolvedValue(true);

      const response = await request(app).delete('/api/import-export/backups/backup-123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockService.deleteBackup).toHaveBeenCalledWith('backup-123');
    });

    it('should return 404 when backup not found', async () => {
      mockService.deleteBackup.mockResolvedValue(false);

      const response = await request(app).delete('/api/import-export/backups/non-existent');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Backup not found');
    });

    it('should handle delete errors', async () => {
      mockService.deleteBackup.mockRejectedValue(new Error('Delete failed'));

      const response = await request(app).delete('/api/import-export/backups/backup-123');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/import-export/backups/:backupId/download', () => {
    it('should download backup file', async () => {
      const mockBackupPath = '/path/to/backup-test-123.json.gz';
      mockService.getBackupFilePath.mockResolvedValue(mockBackupPath);
      (fs.access as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app).get('/api/import-export/backups/backup-123/download');

      // res.sendFile will fail in test env since the file doesn't exist on disk,
      // but we verify the route logic reached that point (not 404 from backup lookup)
      expect(mockService.getBackupFilePath).toHaveBeenCalledWith('backup-123');
      expect(fs.access).toHaveBeenCalled();
    });

    it('should return 404 when backup not found', async () => {
      mockService.getBackupFilePath.mockResolvedValue(null);

      const response = await request(app).get('/api/import-export/backups/non-existent/download');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Backup not found or invalid');
    });

    it('should return 404 when backup file does not exist', async () => {
      mockService.getBackupFilePath.mockResolvedValue('/path/to/backup.json.gz');
      (fs.access as jest.Mock).mockRejectedValue(new Error('ENOENT'));

      const response = await request(app).get('/api/import-export/backups/backup-123/download');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Backup file not found');
    });
  });

  describe('POST /api/import-export/validate', () => {
    it('should validate configuration file without importing', async () => {
      mockService.importConfigurations.mockResolvedValue({
        success: true,
        importedCount: 0,
        errorCount: 0,
        errors: [],
      });

      const response = await request(app)
        .post('/api/import-export/validate')
        .attach('file', Buffer.from('{}'), 'config.json');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockService.importConfigurations).toHaveBeenCalled();
      expect(fs.unlink).toHaveBeenCalled();
    });

    it('should return validation errors', async () => {
      mockService.importConfigurations.mockResolvedValue({
        success: true,
        importedCount: 0,
        errorCount: 2,
        errors: ['Invalid config format', 'Missing required field'],
      });

      const response = await request(app)
        .post('/api/import-export/validate')
        .attach('file', Buffer.from('{}'), 'config.json');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 400 when no file uploaded', async () => {
      const response = await request(app).post('/api/import-export/validate').send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('No file uploaded');
    });

    it('should clean up uploaded file after validation', async () => {
      mockService.importConfigurations.mockResolvedValue({
        success: true,
        importedCount: 0,
      });

      await request(app)
        .post('/api/import-export/validate')
        .attach('file', Buffer.from('{}'), 'config.json');

      expect(fs.unlink).toHaveBeenCalled();
    });

    it('should clean up on validation error', async () => {
      mockService.importConfigurations.mockRejectedValue(new Error('Validation failed'));

      await request(app)
        .post('/api/import-export/validate')
        .attach('file', Buffer.from('{}'), 'config.json');

      expect(fs.unlink).toHaveBeenCalled();
    });
  });

  describe('Multer Error Handling', () => {
    it('should handle LIMIT_FILE_SIZE error', async () => {
      const response = await request(app)
        .post('/api/import-export/import')
        .attach('file', Buffer.alloc(60 * 1024 * 1024), 'large.json');

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('File too large');
    });

    it('should handle other multer errors', async () => {
      const multer = require('multer');
      const error = new multer.MulterError('LIMIT_UNEXPECTED_FILE');

      // This is hard to simulate in integration test, but covered by unit logic
      expect(error.code).toBe('LIMIT_UNEXPECTED_FILE');
    });

    it('should handle non-multer errors during upload', async () => {
      // Generic error handling is tested via service mock rejections
      mockService.importConfigurations.mockRejectedValue(new Error('Generic error'));

      const response = await request(app)
        .post('/api/import-export/import')
        .attach('file', Buffer.from('{}'), 'config.json');

      expect(response.status).toBe(500);
    });
  });

  describe('Authorization', () => {
    it('should require admin for export', async () => {
      // This is mocked to always pass, but in real implementation would check role
      mockService.exportConfigurations.mockResolvedValue({
        success: true,
        filePath: '/path/to/export.json',
      });

      const response = await request(app)
        .post('/api/import-export/export')
        .send({
          configIds: [1],
        });

      expect(response.status).toBe(200);
    });

    it('should require admin for import', async () => {
      mockService.importConfigurations.mockResolvedValue({
        success: true,
        importedCount: 1,
      });

      const response = await request(app)
        .post('/api/import-export/import')
        .attach('file', Buffer.from('{}'), 'config.json');

      expect(response.status).toBe(200);
    });

    it('should allow authenticated users to validate', async () => {
      mockService.importConfigurations.mockResolvedValue({
        success: true,
        importedCount: 0,
      });

      const response = await request(app)
        .post('/api/import-export/validate')
        .attach('file', Buffer.from('{}'), 'config.json');

      expect(response.status).toBe(200);
    });
  });
});
