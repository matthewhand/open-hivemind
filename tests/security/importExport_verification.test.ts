<<<<<<< HEAD
<<<<<<< HEAD
=======
import * as path from 'path';
>>>>>>> af29c671d (🔒 fix: path traversal hardening for backups and templates (final v2))
=======
import * as path from 'path';
>>>>>>> af29c671d (🔒 fix: path traversal hardening for backups and templates (final v2))
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

// Mock fs/promises to handle fs.access in the download route
jest.mock('fs/promises', () => ({
  __esModule: true,
  default: {
    access: jest.fn().mockResolvedValue(undefined),
    readFile: jest.fn(),
    writeFile: jest.fn(),
    readdir: jest.fn().mockResolvedValue([]),
    mkdir: jest.fn().mockResolvedValue(undefined),
    unlink: jest.fn(),
    rename: jest.fn(),
    stat: jest.fn(),
  },
}));

// Create a STABLE mock service that persists across beforeEach calls
const mockService = {
  listBackups: jest.fn(),
  restoreFromBackup: jest.fn(),
  getBackupFilePath: jest.fn(),
  exportConfigurations: jest.fn(),
  importConfigurations: jest.fn(),
  createBackup: jest.fn(),
  deleteBackup: jest.fn(),
};

// Mock ConfigurationImportExportService - getInstance always returns the same mockService
jest.mock('../../src/server/services/ConfigurationImportExportService', () => ({
  ConfigurationImportExportService: {
    getInstance: jest.fn().mockReturnValue(mockService),
  },
}));

describe('ImportExport Path Traversal Verification', () => {
  let app: express.Application;

  beforeEach(() => {
    // Clear mock call history but keep implementations
    jest.clearAllMocks();

    // Re-setup the stable mockService's default implementations
    mockService.restoreFromBackup.mockResolvedValue({ success: true });

    app = express();
    app.use(express.json());

    // Mock res.sendFile
    app.use((req, res, next) => {
      res.sendFile = jest.fn().mockImplementation((filePath) => {
        res.status(200).json({ sentPath: filePath });
      }) as any;
      next();
    });

<<<<<<< HEAD
    // Mount the router (uses cached module with the stable mockService)
=======
    // Mount the router
    // eslint-disable-next-line @typescript-eslint/no-var-requires
<<<<<<< HEAD
>>>>>>> af29c671d (🔒 fix: path traversal hardening for backups and templates (final v2))
=======
>>>>>>> af29c671d (🔒 fix: path traversal hardening for backups and templates (final v2))
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
    mockService.getBackupFilePath.mockResolvedValue(safePath);

    const res = await request(app).get('/api/import-export/backups/safe-id/download');

    expect(res.status).toBe(200);
    // The route sets Content-Type to application/gzip before our mock sendFile sets JSON,
    // so supertest returns the body as a Buffer. Parse it manually.
    const body = Buffer.isBuffer(res.body) ? JSON.parse(res.body.toString()) : res.body;
    expect(body.sentPath).toBe(safePath);
  });
});
