import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import Debug from 'debug';
import { Router, type Request, type Response } from 'express';
import { ApiResponse } from '@src/server/utils/apiResponse';
import { DatabaseManager } from '../../../database/DatabaseManager';
import { HTTP_STATUS } from '../../../types/constants';
import {
  ConfigurationImportExportService,
  type ExportOptions,
  type ImportOptions,
} from '../../services/ConfigurationImportExportService';

const router = Router();
const debug = Debug('app:webui:admin:backup');

const isTestEnv = process.env.NODE_ENV === 'test';
const rateLimit = require('express-rate-limit').default;

const configRateLimit = isTestEnv
  ? (_req: Request, _res: Response, next: any) => next()
  : rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: 'Too many configuration attempts, please try again later.',
      standardHeaders: true,
    });

const ALLOWED_FORMATS = ['json', 'yaml', 'csv'] as const;

function normalizeFormat(value: unknown): 'json' | 'yaml' | 'csv' {
  return ALLOWED_FORMATS.includes(value as any) ? (value as 'json' | 'yaml' | 'csv') : 'json';
}

/**
 * POST /api/admin/export
 *
 * Export bot configurations using ConfigurationImportExportService and return
 * the exported document as JSON so the WebUI can offer it as a download.
 *
 * When no `configIds` are supplied, every stored bot configuration is exported.
 */
router.post('/export', configRateLimit, async (req: Request, res: Response) => {
  try {
    const service = ConfigurationImportExportService.getInstance();

    let configIds: number[] = Array.isArray(req.body?.configIds)
      ? req.body.configIds.filter((id: unknown) => typeof id === 'number' && id > 0)
      : [];

    // Default to exporting all configurations when none are specified.
    if (configIds.length === 0) {
      const all = await DatabaseManager.getInstance().getAllBotConfigurations();
      configIds = all.map((c) => c.id).filter((id): id is number => typeof id === 'number');
    }

    if (configIds.length === 0) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json(ApiResponse.error('No configurations available to export'));
    }

    // Force JSON + uncompressed/unencrypted output so the WebUI can read the
    // generated file back and stream it to the browser as a download.
    const options: ExportOptions = {
      format: 'json',
      includeVersions: req.body?.includeVersions !== false,
      includeAuditLogs: req.body?.includeAuditLogs !== false,
      includeTemplates: req.body?.includeTemplates !== false,
      compress: false,
      encrypt: false,
    };

    const createdBy = (req as any).user?.username || 'unknown';
    const result = await service.exportConfigurations(configIds, options, undefined, createdBy);

    if (!result.success || !result.filePath) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json(ApiResponse.error(result.error ?? 'Failed to export configurations'));
    }

    const raw = await fs.readFile(result.filePath, 'utf8');
    const exportData = JSON.parse(raw);

    return res.json(ApiResponse.success(exportData));
  } catch (error) {
    debug('Error exporting configurations:', error);
    return res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json(ApiResponse.error(error instanceof Error ? error.message : String(error)));
  }
});

/**
 * POST /api/admin/import
 *
 * Import bot configurations from a backup document provided in the request
 * body. The WebUI reads the selected file client-side and sends its text
 * content as `content`, avoiding multipart handling on this admin route.
 */
router.post('/import', configRateLimit, async (req: Request, res: Response) => {
  let tempFilePath: string | null = null;
  try {
    const content = req.body?.content;
    if (typeof content !== 'string' || content.trim().length === 0) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json(ApiResponse.error('No backup content provided'));
    }

    const format = normalizeFormat(req.body?.format);
    const dryRun = req.body?.dryRun === true || req.body?.dryRun === 'true';
    const overwrite = req.body?.overwrite === true || req.body?.overwrite === 'true';

    // Persist the uploaded content to a temp file so the service can read it.
    tempFilePath = path.join(os.tmpdir(), `hivemind-import-${Date.now()}.${format}`);
    await fs.writeFile(tempFilePath, content, 'utf8');

    const options: ImportOptions = {
      format,
      overwrite,
      validateOnly: dryRun,
    };

    if (typeof req.body?.decryptionKey === 'string' && req.body.decryptionKey.length > 0) {
      options.decryptionKey = req.body.decryptionKey;
    }

    const importedBy = (req as any).user?.username || 'unknown';
    const service = ConfigurationImportExportService.getInstance();
    const result = await service.importConfigurations(tempFilePath, options, importedBy);

    if (!result.success) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json(ApiResponse.error(result.errors?.join('; ') || 'Failed to import configurations'));
    }

    return res.json(ApiResponse.success(result));
  } catch (error) {
    debug('Error importing configurations:', error);
    return res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json(ApiResponse.error(error instanceof Error ? error.message : String(error)));
  } finally {
    if (tempFilePath) {
      try {
        await fs.unlink(tempFilePath);
      } catch (cleanupError) {
        debug('Error cleaning up temp import file:', cleanupError);
      }
    }
  }
});

export default router;
