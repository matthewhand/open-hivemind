import { Router, Request, Response } from 'express';
import { ConfigurationImportExportService } from '../services/ConfigurationImportExportService';
import { requireAdmin, authenticate } from '../../auth/middleware';
import { body, query, param } from 'express-validator';
import { validationResult } from 'express-validator';
import { AuthMiddlewareRequest } from '../../auth/types';
 
const multer = require('multer');
import path from 'path';
import fs from 'fs/promises';

const router = Router();
const importExportService = ConfigurationImportExportService.getInstance();

// Configure multer for file uploads
const upload = multer({
  dest: 'config/uploads/',
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req: any, file: any, cb: any) => {
    const allowedTypes = ['.json', '.yaml', '.yml', '.csv', '.gz', '.enc'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(ext) || 
        (file.originalname.endsWith('.json.gz') || file.originalname.endsWith('.json.enc'))) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JSON, YAML, CSV, and compressed/encrypted files are allowed.'));
    }
  }
});

/**
 * Validation middleware for export options
 */
const validateExportOptions = [
  body('configIds')
    .isArray({ min: 1 })
    .withMessage('At least one configuration ID is required')
    .custom((value) => {
      if (!Array.isArray(value)) return false;
      return value.every(id => typeof id === 'number' && id > 0);
    })
    .withMessage('All configuration IDs must be positive numbers'),
  
  body('format')
    .optional()
    .trim()
    .isIn(['json', 'yaml', 'csv'])
    .withMessage('Format must be one of: json, yaml, csv'),
  
  body('includeVersions')
    .optional()
    .isBoolean()
    .withMessage('includeVersions must be a boolean'),
  
  body('includeAuditLogs')
    .optional()
    .isBoolean()
    .withMessage('includeAuditLogs must be a boolean'),
  
  body('includeTemplates')
    .optional()
    .isBoolean()
    .withMessage('includeTemplates must be a boolean'),
  
  body('compress')
    .optional()
    .isBoolean()
    .withMessage('compress must be a boolean'),
  
  body('encrypt')
    .optional()
    .isBoolean()
    .withMessage('encrypt must be a boolean'),
  
  body('encryptionKey')
    .optional()
    .if((value: any, { req }: any) => req.body.encrypt === true)
    .isLength({ min: 8 })
    .withMessage('Encryption key must be at least 8 characters long'),
  
  body('fileName')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('File name must be less than 100 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('File name can only contain letters, numbers, underscores, and hyphens')
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
  
  body('overwrite')
    .optional()
    .isBoolean()
    .withMessage('overwrite must be a boolean'),
  
  body('validateOnly')
    .optional()
    .isBoolean()
    .withMessage('validateOnly must be a boolean'),
  
  body('skipValidation')
    .optional()
    .isBoolean()
    .withMessage('skipValidation must be a boolean'),
  
  body('decryptionKey')
    .optional()
    .isLength({ min: 8 })
    .withMessage('Decryption key must be at least 8 characters long')
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
  
  body('encrypt')
    .optional()
    .isBoolean()
    .withMessage('encrypt must be a boolean'),
  
  body('encryptionKey')
    .optional()
    .if((value: any, { req }: any) => req.body.encrypt === true)
    .isLength({ min: 8 })
    .withMessage('Encryption key must be at least 8 characters long')
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
  
  body('overwrite')
    .optional()
    .isBoolean()
    .withMessage('overwrite must be a boolean'),
  
  body('validateOnly')
    .optional()
    .isBoolean()
    .withMessage('validateOnly must be a boolean'),
  
  body('skipValidation')
    .optional()
    .isBoolean()
    .withMessage('skipValidation must be a boolean'),
  
  body('decryptionKey')
    .optional()
    .isLength({ min: 8 })
    .withMessage('Decryption key must be at least 8 characters long')
];

/**
 * Error handler middleware
 */
const handleValidationErrors = (req: Request, res: Response, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

/**
 * Error handling for file uploads
 */
const handleUploadError = (error: any, req: Request, res: Response, next: any) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 50MB.'
      });
    }
    return res.status(400).json({
      success: false,
      message: `File upload error: ${error.message}`
    });
  } else if (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  next();
};

/**
 * POST /api/import-export/export
 * Export configurations to file
 */
router.post('/export', requireAdmin, validateExportOptions, handleValidationErrors, async (req: AuthMiddlewareRequest, res: Response) => {
  try {
    const authReq = req as any;
    const createdBy = authReq.user?.username || 'unknown';
    
    const result = await importExportService.exportConfigurations(
      req.body.configIds,
      req.body,
      req.body.fileName,
      createdBy
    );

    if (result.success) {
      res.json({
        success: true,
        message: 'Configurations exported successfully',
        data: {
          filePath: result.filePath,
          size: result.size,
          checksum: result.checksum
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Export failed',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error exporting configurations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export configurations',
      error: (error as any).message
    });
  }
});

/**
 * POST /api/import-export/import
 * Import configurations from uploaded file
 */
router.post('/import', 
  requireAdmin, 
  upload.single('file'), 
  handleUploadError,
  validateImportOptions, 
  handleValidationErrors, 
  async (req: AuthMiddlewareRequest, res: Response) => {
    try {
      if (!(req as any).file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }

      const authReq = req as any;
      const importedBy = authReq.user?.username || 'unknown';
      
      const result = await importExportService.importConfigurations(
        (req as any).file.path,
        req.body,
        importedBy
      );

      // Clean up uploaded file
      try {
        await fs.unlink((req as any).file.path);
      } catch (cleanupError) {
        console.error('Error cleaning up uploaded file:', cleanupError);
      }

      res.json({
        success: result.success,
        message: result.success ? 'Configurations imported successfully' : 'Import failed',
        data: result
      });
    } catch (error) {
      console.error('Error importing configurations:', error);
      
      // Clean up uploaded file if it exists
      if ((req as any).file) {
        try {
          await fs.unlink((req as any).file.path);
        } catch (cleanupError) {
          console.error('Error cleaning up uploaded file:', cleanupError);
        }
      }

      res.status(500).json({
        success: false,
        message: 'Failed to import configurations',
        error: (error as any).message
      });
    }
  }
);

/**
 * POST /api/import-export/backup
 * Create a backup of all configurations
 */
router.post('/backup', requireAdmin, validateBackupCreation, handleValidationErrors, async (req: AuthMiddlewareRequest, res: Response) => {
  try {
    const authReq = req as any;
    const createdBy = authReq.user?.username || 'unknown';
    
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
        encryptionKey: req.body.encryptionKey
      }
    );

    if (result.success) {
      res.json({
        success: true,
        message: 'Backup created successfully',
        data: {
          filePath: result.filePath,
          size: result.size,
          checksum: result.checksum
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Backup creation failed',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error creating backup:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create backup',
      error: (error as any).message
    });
  }
});

/**
 * GET /api/import-export/backups
 * List all available backups
 */
router.get('/backups', requireAdmin, async (req: AuthMiddlewareRequest, res: Response) => {
  try {
    const backups = await importExportService.listBackups();
    res.json({
      success: true,
      data: backups,
      count: backups.length
    });
  } catch (error) {
    console.error('Error listing backups:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to list backups',
      error: (error as any).message
    });
  }
});

/**
 * POST /api/import-export/backups/:backupId/restore
 * Restore from backup
 */
router.post('/backups/:backupId/restore', requireAdmin, validateBackupRestore, handleValidationErrors, async (req: AuthMiddlewareRequest, res: Response) => {
  try {
    const { backupId } = req.params;
    const authReq = req as any;
    const restoredBy = authReq.user?.username || 'unknown';
    
    // Get backup metadata
    const backups = await importExportService.listBackups();
    const backup = backups.find(b => b.id === backupId);
    
    if (!backup) {
      return res.status(404).json({
        success: false,
        message: 'Backup not found'
      });
    }

    // Construct backup file path
    const backupFileName = `backup-${backup.name}-${backup.createdAt.getTime()}.json.gz`;
    const backupPath = path.join(process.cwd(), 'config', 'backups', backupFileName);
    
    const result = await importExportService.restoreFromBackup(
      backupPath,
      {
        format: 'json',
        overwrite: req.body.overwrite !== false,
        validateOnly: req.body.validateOnly || false,
        skipValidation: req.body.skipValidation || false,
        decryptionKey: req.body.decryptionKey
      },
      restoredBy
    );

    res.json({
      success: result.success,
      message: result.success ? 'Backup restored successfully' : 'Backup restoration failed',
      data: result
    });
  } catch (error) {
    console.error('Error restoring from backup:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to restore from backup',
      error: (error as any).message
    });
  }
});

/**
 * DELETE /api/import-export/backups/:backupId
 * Delete a backup
 */
router.delete('/backups/:backupId', requireAdmin, async (req: AuthMiddlewareRequest, res: Response) => {
  try {
    const { backupId } = req.params;
    const success = await importExportService.deleteBackup(backupId);
    
    if (success) {
      res.json({
        success: true,
        message: 'Backup deleted successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Backup not found'
      });
    }
  } catch (error) {
    console.error('Error deleting backup:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete backup',
      error: (error as any).message
    });
  }
});

/**
 * GET /api/import-export/backups/:backupId/download
 * Download a backup file
 */
router.get('/backups/:backupId/download', requireAdmin, async (req: AuthMiddlewareRequest, res: Response) => {
  try {
    const { backupId } = req.params;
    
    // Get backup metadata
    const backups = await importExportService.listBackups();
    const backup = backups.find(b => b.id === backupId);
    
    if (!backup) {
      return res.status(404).json({
        success: false,
        message: 'Backup not found'
      });
    }

    // Construct backup file path
    const backupFileName = `backup-${backup.name}-${backup.createdAt.getTime()}.json.gz`;
    const backupPath = path.join(process.cwd(), 'config', 'backups', backupFileName);
    
    // Check if file exists
    try {
      await fs.access(backupPath);
    } catch {
      return res.status(404).json({
        success: false,
        message: 'Backup file not found'
      });
    }

    // Set headers and send file
    res.setHeader('Content-Type', 'application/gzip');
    res.setHeader('Content-Disposition', `attachment; filename="${backupFileName}"`);
    res.sendFile(backupPath);
  } catch (error) {
    console.error('Error downloading backup:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download backup',
      error: (error as any).message
    });
  }
});

/**
 * POST /api/import-export/validate
 * Validate configuration file without importing
 */
router.post('/validate', 
  authenticate, 
  upload.single('file'), 
  handleUploadError,
  async (req: AuthMiddlewareRequest, res: Response) => {
    try {
      if (!(req as any).file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }

      const result = await importExportService.importConfigurations(
        (req as any).file.path,
        {
          format: req.body.format || 'json',
          validateOnly: true,
          skipValidation: false,
          overwrite: false
        }
      );

      // Clean up uploaded file
      try {
        await fs.unlink((req as any).file.path);
      } catch (cleanupError) {
        console.error('Error cleaning up uploaded file:', cleanupError);
      }

      res.json({
        success: true,
        message: 'File validation completed',
        data: result
      });
    } catch (error) {
      console.error('Error validating file:', error);
      
      // Clean up uploaded file if it exists
      if ((req as any).file) {
        try {
          await fs.unlink((req as any).file.path);
        } catch (cleanupError) {
          console.error('Error cleaning up uploaded file:', cleanupError);
        }
      }

      res.status(500).json({
        success: false,
        message: 'Failed to validate file',
        error: (error as any).message
      });
    }
  }
);

export default router;