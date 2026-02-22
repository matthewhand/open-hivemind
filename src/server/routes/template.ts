import { Router, type Request, type Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { authenticate, requireAdmin } from '../../auth/middleware';
import type { AuthMiddlewareRequest } from '../../auth/types';
import { ConfigurationTemplateService } from '../services/ConfigurationTemplateService';
import { ConfigurationValidator } from '../services/ConfigurationValidator';

const router = Router();
const templateService = ConfigurationTemplateService.getInstance();
const configValidator = new ConfigurationValidator();

/**
 * Validation middleware for template creation
 */
const validateTemplateCreation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Template name is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Template name must be between 1 and 100 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Template name can only contain letters, numbers, underscores, and hyphens'),

  body('description')
    .trim()
    .notEmpty()
    .withMessage('Template description is required')
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),

  body('category')
    .trim()
    .isIn(['discord', 'slack', 'mattermost', 'webhook', 'llm', 'general'])
    .withMessage('Invalid template category'),

  body('tags')
    .isArray()
    .withMessage('Tags must be an array')
    .custom((value) => {
      if (!Array.isArray(value)) {
        return false;
      }
      return value.every((tag) => typeof tag === 'string' && tag.length <= 50);
    })
    .withMessage('Tags must be an array of strings, each less than 50 characters'),

  body('config')
    .isObject()
    .withMessage('Template configuration must be an object')
    .custom((value) => {
      const validationResult = configValidator.validateBotConfig(value);
      return validationResult.isValid;
    })
    .withMessage('Invalid template configuration'),
];

/**
 * Validation middleware for template update
 */
const validateTemplateUpdate = [
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Template name cannot be empty')
    .isLength({ min: 1, max: 100 })
    .withMessage('Template name must be between 1 and 100 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Template name can only contain letters, numbers, underscores, and hyphens'),

  body('description')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Template description cannot be empty')
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),

  body('category')
    .optional()
    .trim()
    .isIn(['discord', 'slack', 'mattermost', 'webhook', 'llm', 'general'])
    .withMessage('Invalid template category'),

  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array')
    .custom((value) => {
      if (!Array.isArray(value)) {
        return false;
      }
      return value.every((tag) => typeof tag === 'string' && tag.length <= 50);
    })
    .withMessage('Tags must be an array of strings, each less than 50 characters'),

  body('config')
    .optional()
    .isObject()
    .withMessage('Template configuration must be an object')
    .custom((value) => {
      const validationResult = configValidator.validateBotConfig(value);
      return validationResult.isValid;
    })
    .withMessage('Invalid template configuration'),
];

/**
 * Validation middleware for template ID
 */
const validateTemplateId = [
  param('templateId')
    .trim()
    .notEmpty()
    .withMessage('Template ID is required')
    .matches(/^[a-zA-Z0-9-]+$/)
    .withMessage('Invalid template ID format'),
];

/**
 * Validation middleware for template filters
 */
const validateTemplateFilter = [
  query('category')
    .optional()
    .trim()
    .isIn(['discord', 'slack', 'mattermost', 'webhook', 'llm', 'general'])
    .withMessage('Invalid category filter'),

  query('tags')
    .optional()
    .customSanitizer((value) => {
      if (typeof value === 'string') {
        return value.split(',').map((tag) => tag.trim());
      }
      return value;
    })
    .isArray()
    .withMessage('Tags filter must be an array or comma-separated string'),

  query('search')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Search term must be less than 100 characters'),

  query('isBuiltIn').optional().isBoolean().withMessage('isBuiltIn filter must be a boolean'),

  query('createdBy')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Created by filter must be less than 100 characters'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be an integer between 1 and 100'),
];

/**
 * Validation middleware for template duplication
 */
const validateTemplateDuplication = [
  param('templateId')
    .trim()
    .notEmpty()
    .withMessage('Template ID is required')
    .matches(/^[a-zA-Z0-9-]+$/)
    .withMessage('Invalid template ID format'),

  body('newName')
    .trim()
    .notEmpty()
    .withMessage('New template name is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('New template name must be between 1 and 100 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Template name can only contain letters, numbers, underscores, and hyphens'),
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
      errors: errors.array(),
    });
  }
  return next();
};

/**
 * GET /api/templates
 * Get all templates with optional filtering
 */
router.get(
  '/',
  authenticate,
  validateTemplateFilter,
  handleValidationErrors,
  async (req: AuthMiddlewareRequest, res: Response) => {
    try {
      const authReq = req as any;
      const filters = {
        category: req.query.category as any,
        tags: req.query.tags as string[],
        search: req.query.search as string,
        isBuiltIn: req.query.isBuiltIn ? req.query.isBuiltIn === 'true' : undefined,
        createdBy: req.query.createdBy as string,
      };

      // Filter by user if not admin
      if (!authReq.user?.isAdmin && filters.createdBy) {
        filters.createdBy = authReq.user?.username;
      }

      const templates = await templateService.getAllTemplates(filters);
      return res.json({
        success: true,
        data: templates,
        count: templates.length,
      });
    } catch (error) {
      console.error('Error getting templates:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get templates',
        error: (error as any).message,
      });
    }
  }
);

/**
 * GET /api/templates/popular
 * Get popular templates by usage count
 */
router.get(
  '/popular',
  authenticate,
  validateTemplateFilter,
  handleValidationErrors,
  async (req: AuthMiddlewareRequest, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const templates = await templateService.getPopularTemplates(limit);
      return res.json({
        success: true,
        data: templates,
        count: templates.length,
      });
    } catch (error) {
      console.error('Error getting popular templates:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get popular templates',
        error: (error as any).message,
      });
    }
  }
);

/**
 * GET /api/templates/recent
 * Get recently created templates
 */
router.get(
  '/recent',
  authenticate,
  validateTemplateFilter,
  handleValidationErrors,
  async (req: AuthMiddlewareRequest, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const templates = await templateService.getRecentTemplates(limit);
      return res.json({
        success: true,
        data: templates,
        count: templates.length,
      });
    } catch (error) {
      console.error('Error getting recent templates:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get recent templates',
        error: (error as any).message,
      });
    }
  }
);

/**
 * GET /api/templates/categories/:category
 * Get templates by category
 */
router.get(
  '/categories/:category',
  authenticate,
  validateTemplateFilter,
  handleValidationErrors,
  async (req: AuthMiddlewareRequest, res: Response) => {
    try {
      const { category } = req.params;
      const templates = await templateService.getTemplatesByCategory(category);
      return res.json({
        success: true,
        data: templates,
        count: templates.length,
      });
    } catch (error) {
      console.error('Error getting templates by category:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get templates by category',
        error: (error as any).message,
      });
    }
  }
);

/**
 * GET /api/templates/:templateId
 * Get a specific template by ID
 */
router.get(
  '/:templateId',
  authenticate,
  validateTemplateId,
  handleValidationErrors,
  async (req: AuthMiddlewareRequest, res: Response) => {
    try {
      const { templateId } = req.params;
      const template = await templateService.getTemplateById(templateId);

      if (!template) {
        return res.status(404).json({
          success: false,
          message: 'Template not found',
        });
      }

      return res.json({
        success: true,
        data: template,
      });
    } catch (error) {
      console.error('Error getting template:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get template',
        error: (error as any).message,
      });
    }
  }
);

/**
 * POST /api/templates
 * Create a new template
 */
router.post(
  '/',
  requireAdmin,
  validateTemplateCreation,
  handleValidationErrors,
  async (req: AuthMiddlewareRequest, res: Response) => {
    try {
      const authReq = req as any;
      const createdBy = authReq.user?.username || 'unknown';

      const template = await templateService.createTemplate({
        ...req.body,
        createdBy,
      });

      return res.status(201).json({
        success: true,
        message: 'Template created successfully',
        data: template,
      });
    } catch (error) {
      console.error('Error creating template:', error);
      return res.status(400).json({
        success: false,
        message: 'Failed to create template',
        error: (error as any).message,
      });
    }
  }
);

/**
 * PUT /api/templates/:templateId
 * Update an existing template
 */
router.put(
  '/:templateId',
  requireAdmin,
  validateTemplateId,
  validateTemplateUpdate,
  handleValidationErrors,
  async (req: AuthMiddlewareRequest, res: Response) => {
    try {
      const { templateId } = req.params;
      const template = await templateService.updateTemplate(templateId, req.body);

      return res.json({
        success: true,
        message: 'Template updated successfully',
        data: template,
      });
    } catch (error) {
      console.error('Error updating template:', error);
      return res.status(400).json({
        success: false,
        message: 'Failed to update template',
        error: (error as any).message,
      });
    }
  }
);

/**
 * DELETE /api/templates/:templateId
 * Delete a template
 */
router.delete(
  '/:templateId',
  requireAdmin,
  validateTemplateId,
  handleValidationErrors,
  async (req: AuthMiddlewareRequest, res: Response) => {
    try {
      const { templateId } = req.params;
      const success = await templateService.deleteTemplate(templateId);

      if (success) {
        return res.json({
          success: true,
          message: 'Template deleted successfully',
        });
      } else {
        return res.status(404).json({
          success: false,
          message: 'Template not found',
        });
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      return res.status(400).json({
        success: false,
        message: 'Failed to delete template',
        error: (error as any).message,
      });
    }
  }
);

/**
 * POST /api/templates/:templateId/duplicate
 * Duplicate a template
 */
router.post(
  '/:templateId/duplicate',
  requireAdmin,
  validateTemplateId,
  validateTemplateDuplication,
  handleValidationErrors,
  async (req: AuthMiddlewareRequest, res: Response) => {
    try {
      const { templateId } = req.params;
      const { newName } = req.body;
      const authReq = req as any;
      const createdBy = authReq.user?.username || 'unknown';

      const template = await templateService.duplicateTemplate(templateId, newName, createdBy);

      return res.status(201).json({
        success: true,
        message: 'Template duplicated successfully',
        data: template,
      });
    } catch (error) {
      console.error('Error duplicating template:', error);
      return res.status(400).json({
        success: false,
        message: 'Failed to duplicate template',
        error: (error as any).message,
      });
    }
  }
);

/**
 * GET /api/templates/:templateId/export
 * Export template as JSON
 */
router.get(
  '/:templateId/export',
  authenticate,
  validateTemplateId,
  handleValidationErrors,
  async (req: AuthMiddlewareRequest, res: Response) => {
    try {
      const { templateId } = req.params;
      const templateJson = await templateService.exportTemplate(templateId);

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${templateId}.json"`);
      return res.send(templateJson);
    } catch (error) {
      console.error('Error exporting template:', error);
      return res.status(400).json({
        success: false,
        message: 'Failed to export template',
        error: (error as any).message,
      });
    }
  }
);

/**
 * POST /api/templates/import
 * Import template from JSON
 */
router.post('/import', requireAdmin, async (req: AuthMiddlewareRequest, res: Response) => {
  try {
    const authReq = req as any;
    const createdBy = authReq.user?.username || 'unknown';

    if (!req.body || !req.body.templateData) {
      return res.status(400).json({
        success: false,
        message: 'Template data is required',
      });
    }

    const template = await templateService.importTemplate(req.body.templateData, createdBy);

    return res.status(201).json({
      success: true,
      message: 'Template imported successfully',
      data: template,
    });
  } catch (error) {
    console.error('Error importing template:', error);
    return res.status(400).json({
      success: false,
      message: 'Failed to import template',
      error: (error as any).message,
    });
  }
});

/**
 * POST /api/templates/:templateId/use
 * Track template usage
 */
router.post(
  '/:templateId/use',
  authenticate,
  validateTemplateId,
  handleValidationErrors,
  async (req: AuthMiddlewareRequest, res: Response) => {
    try {
      const { templateId } = req.params;
      await templateService.incrementUsageCount(templateId);

      return res.json({
        success: true,
        message: 'Template usage tracked successfully',
      });
    } catch (error) {
      console.error('Error tracking template usage:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to track template usage',
        error: (error as any).message,
      });
    }
  }
);

export default router;
