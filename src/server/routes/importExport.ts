import fs from 'fs/promises';
import * as path from 'path';
import { Router, type Request, type Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import multer from 'multer';
import { ApiResponse } from '@src/server/utils/apiResponse';
import { authenticate, requireAdmin } from '../../auth/middleware';
import type { AuthMiddlewareRequest } from '../../auth/types';
import { createLogger } from '../../common/StructuredLogger';
import { configLimiter } from '../../middleware/rateLimiter';
import { HTTP_STATUS } from '../../types/constants';
import {
  BackupCreateSchema,
  BackupRestoreSchema,
  ExportConfigSchema,
  ValidateImportSchema,
} from '../../validation/schemas/miscSchema';
import { validateRequest } from '../../validation/validateRequest';
import { ConfigurationImportExportService } from '../services/ConfigurationImportExportService';
import { asyncErrorHandler } from '../middleware/errorHandler';

type MulterFile = {
  path: string;
  fieldname: string;
  originalname: string;
  mimetype: string;
  size: number;
};

type AuthMulterRequest = AuthMiddlewareRequest & { file?: MulterFile };

const router = Router();
const logger = createLogger('importExportRouter');
const importExportService = ConfigurationImportExportService.getInstance();

// Configure multer for file uploads
const upload = multer({
  dest: 'config/uploads/',
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (
    _req: Express.Request,
    file: { originalname: string },
    cb: (error: Error | null, acceptFile?: boolean) => void
  ) => {
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
    .if(
      ((_value: string, { req }: { req: Request }) =>
        (req.body as Record<string, unknown>).encrypt === true) as any
    )
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
    .if(
      ((_value: string, { req }: { req: Request }) =>
        (req.body as Record<string, unknown>).encrypt === true) as any
    )
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
const handleValidationErrors = (req: Request, res: Response, next: (err?: unknown) => void) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json(ApiResponse.error('Validation failed'));
  }
  return next();
};

/**
 * Error handling for file uploads
 */
const handleUploadError = (
  error: Error | null,
  req: Request,
  res: Response,
  next: (err?: unknown) => void
) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json(ApiResponse.error('File too large. Maximum size is 50MB.'));
    }
    return res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json(ApiResponse.error(`File upload error: ${error.message}`));
  } else if (error) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json(ApiResponse.error(error.message));
  }
  return next();
};

/**
 * POST /api/import-export/export
 * Export configurations to file
 */
router.post(
  '/export',
  configLimiter,
  requireAdmin,
  validateRequest(ExportConfigSchema),
  validateExportOptions,
  handleValidationErrors, asyncErrorHandler(async (req, res) => {
    try {
      const createdBy = req.user?.username || 'unknown';

      const result = await importExportService.exportConfigurations(
        req.body.configIds,
        req.body,
        req.body.fileName,
        createdBy
      );

      if (result.success) {
        return res.json(
          ApiResponse.success({
            filePath: result.filePath,
            size: result.size,
            checksum: result.checksum,
          })
        );
      } else {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(ApiResponse.error(result.error));
      }
    } catch (error) {
      logger.error('Error exporting configurations:', error);
      return res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json(ApiResponse.error(error instanceof Error ? error.message : String(error)));
    }
  }
);

/**
 * POST /api/import-export/import
 * Import configurations from uploaded file
 */
router.post(
  '/import',
  configLimiter,
  requireAdmin,
  upload.single('file'),
  handleUploadError,
  validateImportOptions,
  handleValidationErrors, asyncErrorHandler(async (req, res) => {
    try {
      if (!req.file) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(ApiResponse.error('No file uploaded'));
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
        logger.error('Error cleaning up uploaded file:', cleanupError);
      }

      return res.json(
        ApiResponse.success({
          success: result.success,
          message: result.success ? 'Configurations imported successfully' : 'Import failed',
          data: result,
        })
      );
    } catch (error) {
      logger.error('Error importing configurations:', error);

      // Clean up uploaded file if it exists
      if (req.file) {
        try {
          await fs.unlink(req.file.path);
        } catch (cleanupError) {
          logger.error('Error cleaning up uploaded file:', cleanupError);
        }
      }

      return res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json(ApiResponse.error(error instanceof Error ? error.message : String(error)));
    }
  }
);

/**
 * POST /api/import-export/backup
 * Create a backup of all configurations
 */
router.post(
  '/backup',
  configLimiter,
  requireAdmin,
  validateRequest(BackupCreateSchema),
  validateBackupCreation,
  handleValidationErrors, asyncErrorHandler(async (req, res) => {
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
        return res.json(
          ApiResponse.success({
            filePath: result.filePath,
            size: result.size,
            checksum: result.checksum,
          })
        );
      } else {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(ApiResponse.error(result.error));
      }
    } catch (error) {
      logger.error('Error creating backup:', error);
      return res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json(ApiResponse.error(error instanceof Error ? error.message : String(error)));
    }
  }
);

/**
 * GET /api/import-export/backups
 * List all available backups
 */
router.get('/backups', requireAdmin, asyncErrorHandler(async (req, res) => {
  try {
    const backups = await importExportService.listBackups();
    return res.json(ApiResponse.success(backups));
  } catch (error) {
    logger.error('Error listing backups:', error);
    return res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json(ApiResponse.error(error instanceof Error ? error.message : String(error)));
  }
});

/**
 * POST /api/import-export/backups/:backupId/restore
 * Restore from backup
 */
router.post(
  '/backups/:backupId/restore',
  configLimiter,
  requireAdmin,
  validateRequest(BackupRestoreSchema),
  validateBackupRestore,
  handleValidationErrors, asyncErrorHandler(async (req, res) => {
    try {
      const { backupId } = req.params;
      const restoredBy = req.user?.username || 'unknown';

      // Get safe backup file path
      const backupPath = await importExportService.getBackupFilePath(backupId);

      if (!backupPath) {
        return res
          .status(HTTP_STATUS.NOT_FOUND)
          .json(ApiResponse.error('Backup not found or invalid'));
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

      return res.json(
        ApiResponse.success({
          success: result.success,
          message: result.success ? 'Backup restored successfully' : 'Backup restoration failed',
          data: result,
        })
      );
    } catch (error) {
      logger.error('Error restoring from backup:', error);
      return res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json(ApiResponse.error(error instanceof Error ? error.message : String(error)));
    }
  }
);

/**
 * DELETE /api/import-export/backups/:backupId
 * Delete a backup
 */
router.delete(
  '/backups/:backupId',
  configLimiter,
  requireAdmin, asyncErrorHandler(async (req, res) => {
    try {
      const { backupId } = req.params;
      const success = await importExportService.deleteBackup(backupId);

      if (success) {
        return res.json(ApiResponse.success());
      } else {
        return res.status(HTTP_STATUS.NOT_FOUND).json(ApiResponse.error('Backup not found'));
      }
    } catch (error) {
      logger.error('Error deleting backup:', error);
      return res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json(ApiResponse.error(error instanceof Error ? error.message : String(error)));
    }
  }
);

/**
 * GET /api/import-export/backups/:backupId/download
 * Download a backup file
 */
router.get(
  '/backups/:backupId/download',
  requireAdmin, asyncErrorHandler(async (req, res) => {
    try {
      const { backupId } = req.params;

      // Get safe backup file path
      const backupPath = await importExportService.getBackupFilePath(backupId);

      if (!backupPath) {
        return res
          .status(HTTP_STATUS.NOT_FOUND)
          .json(ApiResponse.error('Backup not found or invalid'));
      }

      const backupFileName = path.basename(backupPath);

      // Check if file exists
      try {
        await fs.access(backupPath);
      } catch {
        return res.status(HTTP_STATUS.NOT_FOUND).json(ApiResponse.error('Backup file not found'));
      }

      // Set headers and send file
      res.setHeader('Content-Type', 'application/gzip');
      res.setHeader('Content-Disposition', `attachment; filename="${backupFileName}"`);
      return res.sendFile(backupPath);
    } catch (error) {
      logger.error('Error downloading backup:', error);
      return res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json(ApiResponse.error(error instanceof Error ? error.message : String(error)));
    }
  }
);

/**
 * POST /api/import-export/validate
 * Validate configuration file without importing
 */
router.post(
  '/validate',
  configLimiter,
  authenticate,
  upload.single('file'),
  validateRequest(ValidateImportSchema),
  handleUploadError, asyncErrorHandler(async (req, res) => {
    try {
      if (!req.file) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(ApiResponse.error('No file uploaded'));
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
        logger.error('Error cleaning up uploaded file:', cleanupError);
      }

      return res.json(ApiResponse.success(result));
    } catch (error) {
      logger.error('Error validating file:', error);

      // Clean up uploaded file if it exists
      if (req.file) {
        try {
          await fs.unlink(req.file.path);
        } catch (cleanupError) {
          logger.error('Error cleaning up uploaded file:', cleanupError);
        }
      }

      return res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json(ApiResponse.error(error instanceof Error ? error.message : String(error)));
    }
  }
);

export default router;
