import fs from 'fs/promises';
import path from 'path';
import { Router, type NextFunction, type Request, type Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { authenticate, requireAdmin } from '../../auth/middleware';
import type { AuthMiddlewareRequest } from '../../auth/types';
import { ConfigurationImportExportService } from '../services/ConfigurationImportExportService';
import Debug from 'debug';
import { validateRequest } from '../../validation/validateRequest';
import { BackupIdParamSchema } from '../../validation/schemas/importExportSchema';
import { ApiResponse } from '../../utils/apiResponse';
const debug = Debug('app:server:routes:importExport');

type MulterFile = {
  path: string;
  fieldname: string;
  originalname: string;
  mimetype: string;
  size: number;
};

type AuthMulterRequest = AuthMiddlewareRequest & { file?: MulterFile };

const multer = require('multer');

const router = Router();
const importExportService = ConfigurationImportExportService.getInstance();

// Configure multer for file uploads
const upload = multer({
  dest: 'config/uploads/',
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (_req: unknown, file: { originalname: string }, cb: (error: Error | null, acceptFile?: boolean) => void) => {
    const allowedTypes = ['.json', '.yaml', '.yml', '.csv', '.gz', '.enc'];
    const ext = path.extname(file.originalname).toLowerCase();

    if (
      allowedTypes.includes(ext) ||
      file.originalname.endsWith('.json.gz') ||
      file.originalname.endsWith('.json.enc')
    ) {
      cb(null, true);
    } else {
      cb(
        new Error(
          'Invalid file type. Only JSON, YAML, CSV, and compressed/encrypted files are allowed.'
        )
      );
    }
  },
});

/**
 * Validation middleware for export options
 */
const validateExportOptions = [
  body('configIds')
    .isArray({ min: 1 })
    .withMessage('At least one configuration ID is required')
    .custom((value) => {
      if (!Array.isArray(value)) {
        return false;
      }
      return value.every((id) => typeof id === 'number' && id > 0);
    })
    .withMessage('All configuration IDs must be positive numbers'),

  body('format')
    .optional()
    .trim()
    .isIn(['json', 'yaml', 'csv'])
    .withMessage('Format must be one of: json, yaml, csv'),

  body('includeVersions').optional().isBoolean().withMessage('includeVersions must be a boolean'),

  body('includeAuditLogs').optional().isBoolean().withMessage('includeAuditLogs must be a boolean'),

  body('includeTemplates').optional().isBoolean().withMessage('includeTemplates must be a boolean'),

  body('compress').optional().isBoolean().withMessage('compress must be a boolean'),

  body('encrypt').optional().isBoolean().withMessage('encrypt must be a boolean'),

  body('encryptionKey')
    .optional()
    .if((_value: unknown, { req }: { req: { body?: { encrypt?: boolean } } }) => req.body?.encrypt === true)
    .isLength({ min: 8 })
    .withMessage('Encryption key must be at least 8 characters long'),

  body('fileName')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('File name must be less than 100 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('File name can only contain letters, numbers, underscores, and hyphens'),
];

/**
 * Validation middleware for import options
 */
const validateImportOptions = [
  body('format')
    .optional()
    .trim()
    .isIn(['json', 'yaml', 'csv'])
    .withMessage('Format must be one of: json, yaml, csv'),

  body('overwrite').optional().isBoolean().withMessage('overwrite must be a boolean'),

  body('validateOnly').optional().isBoolean().withMessage('validateOnly must be a boolean'),

  body('skipValidation').optional().isBoolean().withMessage('skipValidation must be a boolean'),

  body('decryptionKey')
    .optional()
    .isLength({ min: 8 })
    .withMessage('Decryption key must be at least 8 characters long'),
];

/**
 * Validation middleware for backup creation
 */
const validateBackupCreation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Backup name is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Backup name must be between 1 and 100 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Backup name can only contain letters, numbers, underscores, and hyphens'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),

  body('encrypt').optional().isBoolean().withMessage('encrypt must be a boolean'),

  body('encryptionKey')
    .optional()
    .if((_value: unknown, { req }: { req: { body?: { encrypt?: boolean } } }) => req.body?.encrypt === true)
    .isLength({ min: 8 })
    .withMessage('Encryption key must be at least 8 characters long'),
];

/**
 * Validation middleware for backup restore
 */
const validateBackupRestore = [
  param('backupId')
    .trim()
    .notEmpty()
    .withMessage('Backup ID is required')
    .matches(/^[a-zA-Z0-9-]+$/)
    .withMessage('Invalid backup ID format'),

  body('overwrite').optional().isBoolean().withMessage('overwrite must be a boolean'),

  body('validateOnly').optional().isBoolean().withMessage('validateOnly must be a boolean'),

  body('skipValidation').optional().isBoolean().withMessage('skipValidation must be a boolean'),

  body('decryptionKey')
    .optional()
    .isLength({ min: 8 })
    .withMessage('Decryption key must be at least 8 characters long'),
];

/**
 * Error handler middleware
 */
const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return ApiResponse.badRequest(res, 'Validation failed', errors.array(),);
  }
  return next();
};

/**
 * Error handling for file uploads
 */
const handleUploadError = (error: unknown, req: Request, res: Response, next: NextFunction) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return ApiResponse.badRequest(res, 'File too large. Maximum size is 50MB.',);
    }
    return res.status(400).json({
      success: false,
      message: `File upload error: ${error.message}`,
    });
  } else if (error) {
    return ApiResponse.badRequest(res, error instanceof Error ? error.message : String(error),);
  }
  return next();
};

/**
 * POST /api/import-export/export
 * Export configurations to file
 */
router.post(
  '/export',
  requireAdmin,
  validateExportOptions,
  handleValidationErrors,
  async (req: AuthMiddlewareRequest, res: Response) => {
    try {
      const createdBy = req.user?.username || 'unknown';

      const result = await importExportService.exportConfigurations(
        req.body.configIds,
        req.body,
        req.body.fileName,
        createdBy
      );

      if (result.success) {
        return res.json({
          success: true,
          message: 'Configurations exported successfully',
          data: {
            filePath: result.filePath,
            size: result.size,
            checksum: result.checksum,
          },
        });
      } else {
        return ApiResponse.badRequest(res, 'Export failed', result.error,);
      }
    } catch (error) {
      debug('ERROR:', 'Error exporting configurations:', error);
      return ApiResponse.serverError(res, 'Failed to export configurations', error instanceof Error ? error.message : String(error));
    }
  }
);

/**
 * POST /api/import-export/import
 * Import configurations from uploaded file
 */
router.post(
  '/import',
  requireAdmin,
  upload.single('file'),
  handleUploadError,
  validateImportOptions,
  handleValidationErrors,
  async (req: AuthMulterRequest, res: Response) => {
    try {
      if (!req.file) {
        return ApiResponse.badRequest(res, 'No file uploaded',);
      }

      const importedBy = req.user?.username || 'unknown';

      const result = await importExportService.importConfigurations(
        req.file.path,
        req.body,
        importedBy
      );

      // Clean up uploaded file
      try {
        await fs.unlink(req.file.path);
      } catch (cleanupError) {
        debug('ERROR:', 'Error cleaning up uploaded file:', cleanupError);
      }

      return res.json({
        success: result.success,
        message: result.success ? 'Configurations imported successfully' : 'Import failed',
        data: result,
      });
    } catch (error) {
      debug('ERROR:', 'Error importing configurations:', error);

      // Clean up uploaded file if it exists
      if (req.file) {
        try {
          await fs.unlink(req.file.path);
        } catch (cleanupError) {
          debug('ERROR:', 'Error cleaning up uploaded file:', cleanupError);
        }
      }

      return ApiResponse.serverError(res, 'Failed to import configurations', error instanceof Error ? error.message : String(error));
    }
  }
);

/**
 * POST /api/import-export/backup
 * Create a backup of all configurations
 */
router.post(
  '/backup',
  requireAdmin,
  validateBackupCreation,
  handleValidationErrors,
  async (req: AuthMiddlewareRequest, res: Response) => {
    try {
      const createdBy = req.user?.username || 'unknown';

      const result = await importExportService.createBackup(
        req.body.name,
        req.body.description,
        createdBy,
        {
          format: req.body.format || 'json',
          includeVersions: req.body.includeVersions !== false,
          includeAuditLogs: req.body.includeAuditLogs !== false,
          includeTemplates: req.body.includeTemplates !== false,
          compress: req.body.compress !== false,
          encrypt: req.body.encrypt || false,
          encryptionKey: req.body.encryptionKey,
        }
      );

      if (result.success) {
        return res.json({
          success: true,
          message: 'Backup created successfully',
          data: {
            filePath: result.filePath,
            size: result.size,
            checksum: result.checksum,
          },
        });
      } else {
        return ApiResponse.badRequest(res, 'Backup creation failed', result.error,);
      }
    } catch (error) {
      debug('ERROR:', 'Error creating backup:', error);
      return ApiResponse.serverError(res, 'Failed to create backup', error instanceof Error ? error.message : String(error));
    }
  }
);

/**
 * GET /api/import-export/backups
 * List all available backups
 */
router.get('/backups', requireAdmin, async (req: AuthMiddlewareRequest, res: Response) => {
  try {
    const backups = await importExportService.listBackups();
    return ApiResponse.success(res, { backups, count: backups.length });
  } catch (error) {
    debug('ERROR:', 'Error listing backups:', error);
    return ApiResponse.serverError(res, 'Failed to list backups', error instanceof Error ? error.message : String(error));
  }
});

/**
 * POST /api/import-export/backups/:backupId/restore
 * Restore from backup
 */
router.post(
  '/backups/:backupId/restore',
  requireAdmin,
  validateBackupRestore,
  handleValidationErrors,
  async (req: AuthMiddlewareRequest, res: Response) => {
    try {
      const { backupId } = req.params;
      const restoredBy = req.user?.username || 'unknown';

      // Get safe backup file path
      const backupPath = await importExportService.getBackupFilePath(backupId);

      if (!backupPath) {
        return ApiResponse.notFound(res, 'Backup not found or invalid',);
      }

      const result = await importExportService.restoreFromBackup(
        backupPath,
        {
          format: 'json',
          overwrite: req.body.overwrite !== false,
          validateOnly: req.body.validateOnly || false,
          skipValidation: req.body.skipValidation || false,
          decryptionKey: req.body.decryptionKey,
        },
        restoredBy
      );

      return res.json({
        success: result.success,
        message: result.success ? 'Backup restored successfully' : 'Backup restoration failed',
        data: result,
      });
    } catch (error) {
      debug('ERROR:', 'Error restoring from backup:', error);
      return ApiResponse.serverError(res, 'Failed to restore from backup', error instanceof Error ? error.message : String(error));
    }
  }
);

/**
 * DELETE /api/import-export/backups/:backupId
 * Delete a backup
 */
router.delete(
  '/backups/:backupId',
  requireAdmin,
  validateRequest(BackupIdParamSchema),
  async (req: AuthMiddlewareRequest, res: Response) => {
    try {
      const { backupId } = req.params;
      const success = await importExportService.deleteBackup(backupId);

      if (success) {
        return ApiResponse.success(res, undefined, 'Backup deleted successfully',);
      } else {
        return ApiResponse.notFound(res, 'Backup not found',);
      }
    } catch (error) {
      debug('ERROR:', 'Error deleting backup:', error);
      return ApiResponse.serverError(res, 'Failed to delete backup', error instanceof Error ? error.message : String(error));
    }
  }
);

/**
 * GET /api/import-export/backups/:backupId/download
 * Download a backup file
 */
router.get(
  '/backups/:backupId/download',
  requireAdmin,
  async (req: AuthMiddlewareRequest, res: Response) => {
    try {
      const { backupId } = req.params;

      // Get safe backup file path
      const backupPath = await importExportService.getBackupFilePath(backupId);

      if (!backupPath) {
        return ApiResponse.notFound(res, 'Backup not found or invalid',);
      }

      const backupFileName = path.basename(backupPath);

      // Check if file exists
      try {
        await fs.access(backupPath);
      } catch {
        return ApiResponse.notFound(res, 'Backup file not found',);
      }

      // Set headers and send file
      res.setHeader('Content-Type', 'application/gzip');
      res.setHeader('Content-Disposition', `attachment; filename="${backupFileName}"`);
      return res.sendFile(backupPath);
    } catch (error) {
      debug('ERROR:', 'Error downloading backup:', error);
      return ApiResponse.serverError(res, 'Failed to download backup', error instanceof Error ? error.message : String(error));
    }
  }
);

/**
 * POST /api/import-export/validate
 * Validate configuration file without importing
 */
router.post(
  '/validate',
  authenticate,
  upload.single('file'),
  handleUploadError,
  async (req: AuthMulterRequest, res: Response) => {
    try {
      if (!req.file) {
        return ApiResponse.badRequest(res, 'No file uploaded',);
      }

      const result = await importExportService.importConfigurations(req.file.path, {
        format: req.body.format || 'json',
        validateOnly: true,
        skipValidation: false,
        overwrite: false,
      });

      // Clean up uploaded file
      try {
        await fs.unlink(req.file.path);
      } catch (cleanupError) {
        debug('ERROR:', 'Error cleaning up uploaded file:', cleanupError);
      }

      return ApiResponse.success(res, result, 'File validation completed');
    } catch (error) {
      debug('ERROR:', 'Error validating file:', error);

      // Clean up uploaded file if it exists
      if (req.file) {
        try {
          await fs.unlink(req.file.path);
        } catch (cleanupError) {
          debug('ERROR:', 'Error cleaning up uploaded file:', cleanupError);
        }
      }

      return ApiResponse.serverError(res, 'Failed to validate file', error instanceof Error ? error.message : String(error));
    }
  }
);

export default router;
