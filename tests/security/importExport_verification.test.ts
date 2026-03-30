import express from 'express';
import request from 'supertest';
import path from 'path';
import { ConfigurationImportExportService } from '../../src/server/services/ConfigurationImportExportService';

// Mock auth middleware to bypass checks
jest.mock('../../src/auth/middleware', () => ({
  authenticate: (req: any, res: any, next: any) => {
    req.user = { username: 'admin', role: 'admin' };
    next();
  },
  requireAdmin: (req: any, res: any, next: any) => next(),
  requireRole: () => (req: any, res: any, next: any) => next(),
}));

// Mock DatabaseManager
jest.mock('../../src/database/DatabaseManager', () => ({
  DatabaseManager: {
    getInstance: jest.fn().mockReturnValue({}),
  },
}));

// Mock ConfigurationImportExportService
jest.mock('../../src/server/services/ConfigurationImportExportService');

describe.skip('ImportExport Path Traversal Verification', () => {
  let app: express.Application;
  let mockService: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockService = {
      listBackups: jest.fn(),
      restoreFromBackup: jest.fn().mockResolvedValue({ success: true }),
      getBackupFilePath: jest.fn(),
    };

    (ConfigurationImportExportService.getInstance as jest.Mock).mockReturnValue(mockService);

    app = express();
    app.use(express.json());

    // Mock res.sendFile
    app.use((req, res, next) => {
      res.sendFile = jest.fn().mockImplementation((filePath) => {
        res.status(200).json({ sentPath: filePath });
      }) as any;
      next();
    });

    // Mount the router
    const importExportRouter = require('../../src/server/routes/importExport').default;
    app.use('/api/import-export', importExportRouter);
  });

  it('GET /api/import-export/backups/:backupId/download should return 404 if path is unsafe', async () => {
    // Mock getBackupFilePath to return null (unsafe or not found)
    mockService.getBackupFilePath.mockResolvedValue(null);

    const res = await request(app).get('/api/import-export/backups/malicious-id/download');

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Backup not found or invalid');
  });

  it('GET /api/import-export/backups/:backupId/download should use safe path if provided', async () => {
    const safePath = path.join(process.cwd(), 'config', 'backups', 'backup-safe-123.json.gz');
    jest.spyOn(require('fs/promises'), 'access').mockResolvedValue();
    mockService.getBackupFilePath.mockResolvedValue(safePath);

    const res = await request(app).get('/api/import-export/backups/safe-id/download');

    expect(res.status).toBe(200);
    expect(res.body.sentPath).toBe(safePath);
  });
});
