import Debug from 'debug';
import { Router, type Request, type Response } from 'express';
import { authenticate, requireAdmin } from '../../auth/middleware';
import { ErrorUtils } from '../../common/ErrorUtils';
import {
  ApplyTemplateSchema,
  CreateTemplateSchema,
  DeleteTemplateSchema,
} from '../../validation/schemas/templatesSchema';
import { validateRequest } from '../../validation/validateRequest';
import { BotConfigService } from '../services/BotConfigService';
import { ConfigurationTemplateService } from '../services/ConfigurationTemplateService';
import { asyncErrorHandler } from '../middleware/errorHandler';

const router = Router();
const debug = Debug('app:routes:templates');

const isTestEnv = process.env.NODE_ENV === 'test';

// Apply authentication middleware to all template routes (skip in tests)
if (!isTestEnv) {
  router.use(authenticate, requireAdmin);
}

/**
 * @openapi
 * /api/admin/templates:
 *   get:
 *     summary: List all configuration templates
 *     tags: [Templates]
 *     parameters:
 *       - name: category
 *         in: query
 *         schema:
 *           type: string
 *           enum: [discord, slack, mattermost, webhook, llm, general]
 *       - name: search
 *         in: query
 *         schema:
 *           type: string
 *       - name: tags
 *         in: query
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of templates
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const templateService = ConfigurationTemplateService.getInstance();
    const { category, search, tags } = req.query;

    const filter: any = {};
    if (category) filter.category = category;
    if (search) filter.search = String(search);
    if (tags)
      filter.tags = String(tags)
        .split(',')
        .map((t) => t.trim());

    const templates = await templateService.getAllTemplates(filter);

    return res.json({
      success: true,
      data: { templates },
      message: 'Templates retrieved successfully',
    });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    debug('Error fetching templates:', hivemindError);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve templates',
      message: hivemindError.message || 'An error occurred while retrieving templates',
    });
  }
});

/**
 * @openapi
 * /api/admin/templates/{id}:
 *   get:
 *     summary: Get template details by ID
 *     tags: [Templates]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Template details
 *       404:
 *         description: Template not found
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const templateService = ConfigurationTemplateService.getInstance();
    const { id } = req.params;

    const template = await templateService.getTemplateById(id);

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
        message: `Template with ID '${id}' does not exist`,
      });
    }

    return res.json({
      success: true,
      data: { template },
      message: 'Template retrieved successfully',
    });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    debug('Error fetching template:', hivemindError);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve template',
      message: hivemindError.message || 'An error occurred while retrieving template',
    });
  }
});

/**
 * @openapi
 * /api/admin/templates/{id}/apply:
 *   post:
 *     summary: Apply template to create a new bot configuration
 *     tags: [Templates]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Name for the new bot
 *               description:
 *                 type: string
 *               overrides:
 *                 type: object
 *                 description: Configuration overrides
 *             required: [name]
 *     responses:
 *       200:
 *         description: Bot created from template
 *       404:
 *         description: Template not found
 */
router.post(
  '/:id/apply',
  validateRequest(ApplyTemplateSchema),
  asyncErrorHandler(async (req, res) => {
    try {
      const templateService = ConfigurationTemplateService.getInstance();
      const botConfigService = BotConfigService.getInstance();
      const { id } = req.params;
      const { name, description, overrides = {} } = req.body;

      if (!name) {
        return res.status(400).json({
          success: false,
          error: 'Missing required field',
          message: 'Bot name is required',
        });
      }

      // Get template
      const template = await templateService.getTemplateById(id);
      if (!template) {
        return res.status(404).json({
          success: false,
          error: 'Template not found',
          message: `Template with ID '${id}' does not exist`,
        });
      }

      // Validate that overrides don't contain protected fields
      const protectedFields = ['name', 'description'];
      const invalidOverrides = Object.keys(overrides).filter((key) =>
        protectedFields.includes(key)
      );

      if (invalidOverrides.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid overrides',
          message: `Cannot override protected fields: ${invalidOverrides.join(', ')}. Use the 'name' and 'description' parameters instead.`,
        });
      }

      // Validate and sanitize name
      const validatedName = String(name).trim();
      if (!validatedName) {
        return res.status(400).json({
          success: false,
          error: 'Invalid name',
          message: 'Bot name cannot be empty',
        });
      }

      // Validate and sanitize description
      const validatedDescription = description ? String(description).trim() : template.description;

      // Create bot configuration from template with validated fields taking precedence
      // Apply overrides first, then ensure validated fields cannot be overwritten
      const botConfig = {
        ...template.config,
        ...overrides,
        name: validatedName,
        description: validatedDescription,
      };

      // Use BotConfigService to create the bot
      const newBot = await botConfigService.createBotConfig(botConfig);

      // Increment template usage count
      await templateService.incrementUsageCount(id);

      return res.json({
        success: true,
        data: { bot: newBot },
        message: 'Bot created from template successfully',
      });
    } catch (error: unknown) {
      const hivemindError = ErrorUtils.toHivemindError(error);
      debug('Error applying template:', hivemindError);
      return res.status(500).json({
        success: false,
        error: 'Failed to apply template',
        message: hivemindError.message || 'An error occurred while applying template',
      });
    }
  }
);

/**
 * @openapi
 * /api/admin/templates:
 *   post:
 *     summary: Create a new template
 *     tags: [Templates]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               description: { type: string }
 *               category: { type: string, enum: [discord, slack, mattermost, webhook, llm, general] }
 *               tags: { type: array, items: { type: string } }
 *               config: { type: object }
 *             required: [name, description, category, config]
 *     responses:
 *       200:
 *         description: Created template
 */
router.post('/', validateRequest(CreateTemplateSchema), asyncErrorHandler(async (req, res) => {
  try {
    const templateService = ConfigurationTemplateService.getInstance();
    const { name, description, category, tags, config } = req.body;

    const template = await templateService.createTemplate({
      name,
      description,
      category,
      tags: tags || [],
      config,
    });

    return res.json({
      success: true,
      data: { template },
      message: 'Template created successfully',
    });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    debug('Error creating template:', hivemindError);
    return res.status(400).json({
      success: false,
      error: 'Failed to create template',
      message: hivemindError.message || 'An error occurred while creating template',
    });
  }
});

/**
 * @openapi
 * /api/admin/templates/{id}:
 *   delete:
 *     summary: Delete a template
 *     tags: [Templates]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Template deleted
 *       404:
 *         description: Template not found
 */
router.delete(
  '/:id',
  validateRequest(DeleteTemplateSchema),
  asyncErrorHandler(async (req, res) => {
    try {
      const templateService = ConfigurationTemplateService.getInstance();
      const { id } = req.params;

      await templateService.deleteTemplate(id);

      return res.json({
        success: true,
        message: 'Template deleted successfully',
      });
    } catch (error: unknown) {
      const hivemindError = ErrorUtils.toHivemindError(error);
      debug('Error deleting template:', hivemindError);

      if (hivemindError.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: 'Template not found',
          message: hivemindError.message,
        });
      }

      return res.status(400).json({
        success: false,
        error: 'Failed to delete template',
        message: hivemindError.message || 'An error occurred while deleting template',
      });
    }
  }
);

export default router;
