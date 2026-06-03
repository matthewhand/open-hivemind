/**
 * Tests for the admin backup router (/api/admin/export, /api/admin/import).
 *
 * Regression: ImportExportPage.tsx posts to /api/admin/export and
 * /api/admin/import, but admin/backup.ts used to be an empty router, so these
 * endpoints returned 404. These tests assert the routes are now wired to
 * ConfigurationImportExportService.
 */
import { promises as fs } from 'fs';
import express from 'express';
import request from 'supertest';
// Import after mocks are registered.

import backupRouter from '../../../../../src/server/routes/admin/backup';

// --- Mock the service so we exercise the route wiring, not the real DB/IO ---
const mockExportConfigurations = jest.fn();
const mockImportConfigurations = jest.fn();
const mockGetAllBotConfigurations = jest.fn();

jest.mock('../../../../../src/server/services/ConfigurationImportExportService', () => ({
  ConfigurationImportExportService: {
    getInstance: () => ({
      exportConfigurations: mockExportConfigurations,
      importConfigurations: mockImportConfigurations,
    }),
  },
}));

jest.mock('../../../../../src/database/DatabaseManager', () => ({
  DatabaseManager: {
    getInstance: () => ({
      getAllBotConfigurations: mockGetAllBotConfigurations,
    }),
  },
}));

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/', backupRouter);
  return app;
}

describe('admin backup router', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /export', () => {
    it('is registered (does not 404) and returns exported data via the service', async () => {
      mockGetAllBotConfigurations.mockResolvedValue([{ id: 1 }, { id: 2 }]);

      // Service writes a file; the route reads it back. Stub fs.readFile.
      const exportDoc = { metadata: { configCount: 2 }, configurations: [{ id: 1 }] };
      const readSpy = jest
        .spyOn(fs, 'readFile')
        .mockResolvedValue(JSON.stringify(exportDoc) as never);

      mockExportConfigurations.mockResolvedValue({
        success: true,
        filePath: '/tmp/export.json',
        size: 10,
        checksum: 'abc',
      });

      const res = await request(buildApp())
        .post('/export')
        .send({ format: 'json', includeVersions: true });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(exportDoc);
      expect(mockExportConfigurations).toHaveBeenCalledTimes(1);
      // Defaulted to all configuration ids when none provided.
      expect(mockExportConfigurations.mock.calls[0][0]).toEqual([1, 2]);

      readSpy.mockRestore();
    });

    it('returns 400 when there are no configurations to export', async () => {
      mockGetAllBotConfigurations.mockResolvedValue([]);

      const res = await request(buildApp()).post('/export').send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(mockExportConfigurations).not.toHaveBeenCalled();
    });
  });

  describe('POST /import', () => {
    it('is registered (does not 404) and imports content via the service', async () => {
      mockImportConfigurations.mockResolvedValue({
        success: true,
        importedCount: 1,
        skippedCount: 0,
        errorCount: 0,
        errors: [],
        warnings: [],
      });

      const res = await request(buildApp())
        .post('/import')
        .send({
          content: JSON.stringify({ configurations: [{ id: 1, name: 'bot' }] }),
          format: 'json',
          dryRun: false,
          overwrite: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.importedCount).toBe(1);
      expect(mockImportConfigurations).toHaveBeenCalledTimes(1);

      // Options forwarded: overwrite=true, validateOnly=false (dryRun)
      const forwardedOptions = mockImportConfigurations.mock.calls[0][1];
      expect(forwardedOptions.overwrite).toBe(true);
      expect(forwardedOptions.validateOnly).toBe(false);
    });

    it('returns 400 when no content is provided', async () => {
      const res = await request(buildApp()).post('/import').send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(mockImportConfigurations).not.toHaveBeenCalled();
    });
  });
});
