import request from 'supertest';
import express, { type Express } from 'express';
import templatesRouter from '../../../../src/server/routes/templates';
import { ConfigurationTemplateService } from '../../../../src/server/services/ConfigurationTemplateService';
import { BotConfigService } from '../../../../src/server/services/BotConfigService';

jest.mock('../../../../src/server/services/ConfigurationTemplateService');
jest.mock('../../../../src/server/services/BotConfigService');

describe('Templates Routes', () => {
  let app: Express;
  let mockTemplateService: jest.Mocked<ConfigurationTemplateService>;
  let mockBotConfigService: jest.Mocked<BotConfigService>;

  const mockTemplate = {
    id: 'test-template-id',
    name: 'Test Template',
    description: 'A test template',
    category: 'general' as const,
    tags: ['test', 'example'],
    config: {
      messageProvider: 'discord',
      llmProvider: 'openai',
    },
    isBuiltIn: false,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    usageCount: 5,
  };

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/admin/templates', templatesRouter);

    mockTemplateService = {
      getAllTemplates: jest.fn(),
      getTemplateById: jest.fn(),
      createTemplate: jest.fn(),
      deleteTemplate: jest.fn(),
      incrementUsageCount: jest.fn(),
    } as any;

    mockBotConfigService = {
      createBotConfig: jest.fn(),
    } as any;

    (ConfigurationTemplateService.getInstance as jest.Mock).mockReturnValue(mockTemplateService);
    (BotConfigService.getInstance as jest.Mock).mockReturnValue(mockBotConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/admin/templates', () => {
    it('should return all templates', async () => {
      const templates = [mockTemplate];
      mockTemplateService.getAllTemplates.mockResolvedValue(templates);

      const response = await request(app).get('/api/admin/templates').expect(200);

      expect(response.body).toEqual({
        success: true,
        data: { templates },
        message: 'Templates retrieved successfully',
      });
      expect(mockTemplateService.getAllTemplates).toHaveBeenCalledWith({});
    });

    it('should filter templates by category', async () => {
      const templates = [mockTemplate];
      mockTemplateService.getAllTemplates.mockResolvedValue(templates);

      const response = await request(app)
        .get('/api/admin/templates?category=general')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockTemplateService.getAllTemplates).toHaveBeenCalledWith({
        category: 'general',
      });
    });

    it('should filter templates by search query', async () => {
      const templates = [mockTemplate];
      mockTemplateService.getAllTemplates.mockResolvedValue(templates);

      const response = await request(app)
        .get('/api/admin/templates?search=test')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockTemplateService.getAllTemplates).toHaveBeenCalledWith({
        search: 'test',
      });
    });

    it('should filter templates by tags', async () => {
      const templates = [mockTemplate];
      mockTemplateService.getAllTemplates.mockResolvedValue(templates);

      const response = await request(app)
        .get('/api/admin/templates?tags=test,example')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockTemplateService.getAllTemplates).toHaveBeenCalledWith({
        tags: ['test', 'example'],
      });
    });

    it('should handle errors gracefully', async () => {
      mockTemplateService.getAllTemplates.mockRejectedValue(
        new Error('Database error')
      );

      const response = await request(app).get('/api/admin/templates').expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to retrieve templates');
    });
  });

  describe('GET /api/admin/templates/:id', () => {
    it('should return a template by id', async () => {
      mockTemplateService.getTemplateById.mockResolvedValue(mockTemplate);

      const response = await request(app)
        .get('/api/admin/templates/test-template-id')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: { template: mockTemplate },
        message: 'Template retrieved successfully',
      });
      expect(mockTemplateService.getTemplateById).toHaveBeenCalledWith('test-template-id');
    });

    it('should return 404 if template not found', async () => {
      mockTemplateService.getTemplateById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/admin/templates/non-existent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Template not found');
    });

    it('should handle errors gracefully', async () => {
      mockTemplateService.getTemplateById.mockRejectedValue(
        new Error('Database error')
      );

      const response = await request(app)
        .get('/api/admin/templates/test-template-id')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to retrieve template');
    });
  });

  describe('POST /api/admin/templates/:id/apply', () => {
    it('should create a bot from template', async () => {
      const mockBot = {
        id: 'bot-123',
        name: 'My New Bot',
        description: 'A test template',
        messageProvider: 'discord',
        llmProvider: 'openai',
      };

      mockTemplateService.getTemplateById.mockResolvedValue(mockTemplate);
      mockBotConfigService.createBotConfig.mockResolvedValue(mockBot);
      mockTemplateService.incrementUsageCount.mockResolvedValue();

      const response = await request(app)
        .post('/api/admin/templates/test-template-id/apply')
        .send({
          name: 'My New Bot',
        })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: { bot: mockBot },
        message: 'Bot created from template successfully',
      });
      expect(mockTemplateService.getTemplateById).toHaveBeenCalledWith('test-template-id');
      expect(mockBotConfigService.createBotConfig).toHaveBeenCalledWith({
        name: 'My New Bot',
        description: 'A test template',
        messageProvider: 'discord',
        llmProvider: 'openai',
      });
      expect(mockTemplateService.incrementUsageCount).toHaveBeenCalledWith('test-template-id');
    });

    it('should apply overrides when creating bot', async () => {
      const mockBot = {
        id: 'bot-123',
        name: 'My Custom Bot',
        description: 'Custom description',
        messageProvider: 'slack',
        llmProvider: 'openai',
      };

      mockTemplateService.getTemplateById.mockResolvedValue(mockTemplate);
      mockBotConfigService.createBotConfig.mockResolvedValue(mockBot);
      mockTemplateService.incrementUsageCount.mockResolvedValue();

      const response = await request(app)
        .post('/api/admin/templates/test-template-id/apply')
        .send({
          name: 'My Custom Bot',
          description: 'Custom description',
          overrides: {
            messageProvider: 'slack',
          },
        })
        .expect(200);

      expect(mockBotConfigService.createBotConfig).toHaveBeenCalledWith({
        name: 'My Custom Bot',
        description: 'Custom description',
        messageProvider: 'slack',
        llmProvider: 'openai',
      });
    });

    it('should return 400 if name is missing', async () => {
      const response = await request(app)
        .post('/api/admin/templates/test-template-id/apply')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Missing required field');
    });

    it('should return 404 if template not found', async () => {
      mockTemplateService.getTemplateById.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/admin/templates/non-existent/apply')
        .send({
          name: 'Test Bot',
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Template not found');
    });

    it('should handle errors gracefully', async () => {
      mockTemplateService.getTemplateById.mockResolvedValue(mockTemplate);
      mockBotConfigService.createBotConfig.mockRejectedValue(
        new Error('Failed to create bot')
      );

      const response = await request(app)
        .post('/api/admin/templates/test-template-id/apply')
        .send({
          name: 'Test Bot',
        })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to apply template');
    });
  });

  describe('POST /api/admin/templates', () => {
    it('should create a new template', async () => {
      const newTemplate = {
        name: 'New Template',
        description: 'A new template',
        category: 'discord' as const,
        tags: ['new', 'custom'],
        config: {
          messageProvider: 'discord',
        },
      };

      mockTemplateService.createTemplate.mockResolvedValue({
        ...mockTemplate,
        ...newTemplate,
        id: 'new-template-id',
      });

      const response = await request(app)
        .post('/api/admin/templates')
        .send(newTemplate)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.template.name).toBe('New Template');
      expect(mockTemplateService.createTemplate).toHaveBeenCalledWith(newTemplate);
    });

    it('should handle errors gracefully', async () => {
      mockTemplateService.createTemplate.mockRejectedValue(
        new Error('Template already exists')
      );

      const response = await request(app)
        .post('/api/admin/templates')
        .send({
          name: 'Duplicate',
          description: 'Test',
          category: 'general',
          config: {},
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to create template');
    });
  });

  describe('DELETE /api/admin/templates/:id', () => {
    it('should delete a template', async () => {
      mockTemplateService.deleteTemplate.mockResolvedValue(true);

      const response = await request(app)
        .delete('/api/admin/templates/test-template-id')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Template deleted successfully',
      });
      expect(mockTemplateService.deleteTemplate).toHaveBeenCalledWith('test-template-id');
    });

    it('should return 404 if template not found', async () => {
      mockTemplateService.deleteTemplate.mockRejectedValue(
        new Error("Template with ID 'non-existent' not found")
      );

      const response = await request(app)
        .delete('/api/admin/templates/non-existent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Template not found');
    });

    it('should return 400 for built-in templates', async () => {
      mockTemplateService.deleteTemplate.mockRejectedValue(
        new Error('Cannot delete built-in templates')
      );

      const response = await request(app)
        .delete('/api/admin/templates/discord-basic')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to delete template');
    });
  });
});
