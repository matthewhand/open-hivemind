import express, { type Express } from 'express';
import request from 'supertest';
import templatesRouter from '../../src/server/routes/templates';
import { BotConfigService } from '../../src/server/services/BotConfigService';
import { ConfigurationTemplateService } from '../../src/server/services/ConfigurationTemplateService';

jest.mock('../../src/server/services/ConfigurationTemplateService');
jest.mock('../../src/server/services/BotConfigService');

describe('Templates API - Comprehensive Tests', () => {
  let app: Express;
  let mockTemplateService: jest.Mocked<ConfigurationTemplateService>;
  let mockBotConfigService: jest.Mocked<BotConfigService>;

  const mockTemplates = [
    {
      id: 'discord-basic',
      name: 'Discord Basic Bot',
      description: 'Basic Discord bot',
      category: 'discord' as const,
      tags: ['discord', 'basic'],
      config: { messageProvider: 'discord' },
      isBuiltIn: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      usageCount: 10,
    },
    {
      id: 'slack-basic',
      name: 'Slack Basic Bot',
      description: 'Basic Slack bot',
      category: 'slack' as const,
      tags: ['slack', 'basic'],
      config: { messageProvider: 'slack' },
      isBuiltIn: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      usageCount: 5,
    },
  ];

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

  describe('Template Discovery', () => {
    it('should list all templates', async () => {
      mockTemplateService.getAllTemplates.mockResolvedValue(mockTemplates);

      const response = await request(app).get('/api/admin/templates').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.templates).toHaveLength(2);
      expect(response.body.data.templates[0].name).toBe('Discord Basic Bot');
    });

    it('should filter templates by category', async () => {
      mockTemplateService.getAllTemplates.mockResolvedValue([mockTemplates[0]]);

      const response = await request(app).get('/api/admin/templates?category=discord').expect(200);

      expect(response.body.success).toBe(true);
      expect(mockTemplateService.getAllTemplates).toHaveBeenCalledWith({
        category: 'discord',
      });
    });

    it('should search templates', async () => {
      mockTemplateService.getAllTemplates.mockResolvedValue([mockTemplates[0]]);

      const response = await request(app).get('/api/admin/templates?search=discord').expect(200);

      expect(response.body.success).toBe(true);
      expect(mockTemplateService.getAllTemplates).toHaveBeenCalledWith({
        search: 'discord',
      });
    });

    it('should filter by multiple tags', async () => {
      mockTemplateService.getAllTemplates.mockResolvedValue(mockTemplates);

      const response = await request(app)
        .get('/api/admin/templates?tags=basic,discord')
        .expect(200);

      expect(mockTemplateService.getAllTemplates).toHaveBeenCalledWith({
        tags: ['basic', 'discord'],
      });
    });
  });

  describe('Template Application', () => {
    it('should create bot from template', async () => {
      const mockBot = {
        id: 'bot-123',
        name: 'My Bot',
        description: 'Basic Discord bot',
        messageProvider: 'discord',
      };

      mockTemplateService.getTemplateById.mockResolvedValue(mockTemplates[0] as any);
      mockBotConfigService.createBotConfig.mockResolvedValue(mockBot);

      const response = await request(app)
        .post('/api/admin/templates/discord-basic/apply')
        .send({ name: 'My Bot' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.bot.name).toBe('My Bot');
      expect(mockTemplateService.incrementUsageCount).toHaveBeenCalledWith('discord-basic');
    });

    it('should apply template with custom description', async () => {
      const mockBot = { id: 'bot-123', name: 'Custom Bot' };

      mockTemplateService.getTemplateById.mockResolvedValue(mockTemplates[0] as any);
      mockBotConfigService.createBotConfig.mockResolvedValue(mockBot);

      await request(app)
        .post('/api/admin/templates/discord-basic/apply')
        .send({
          name: 'Custom Bot',
          description: 'My custom description',
        })
        .expect(200);

      expect(mockBotConfigService.createBotConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Custom Bot',
          description: 'My custom description',
        })
      );
    });

    it('should reject if name is missing', async () => {
      const response = await request(app)
        .post('/api/admin/templates/discord-basic/apply')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Validation failed');
    });

    it('should reject if template not found', async () => {
      mockTemplateService.getTemplateById.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/admin/templates/non-existent/apply')
        .send({ name: 'Test' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Template not found');
    });
  });

  describe('Template Management', () => {
    it('should get template by id', async () => {
      mockTemplateService.getTemplateById.mockResolvedValue(mockTemplates[0] as any);

      const response = await request(app).get('/api/admin/templates/discord-basic').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.template.name).toBe('Discord Basic Bot');
    });

    it('should create custom template', async () => {
      const newTemplate = {
        name: 'Custom Template',
        description: 'A custom template',
        category: 'general' as const,
        tags: ['custom'],
        config: {
          llmProvider: 'openai',
          messageProvider: 'discord',
        },
      };

      mockTemplateService.createTemplate.mockResolvedValue({
        ...newTemplate,
        id: 'custom-123',
        isBuiltIn: false,
        createdAt: '2024-01-02T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
        usageCount: 0,
      } as any);

      const response = await request(app)
        .post('/api/admin/templates')
        .send(newTemplate)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.template.name).toBe('Custom Template');
    });

    it('should delete custom template', async () => {
      mockTemplateService.deleteTemplate.mockResolvedValue(true);

      const response = await request(app).delete('/api/admin/templates/custom-123').expect(200);

      expect(response.body.success).toBe(true);
      expect(mockTemplateService.deleteTemplate).toHaveBeenCalledWith('custom-123');
    });

    it('should reject deletion of built-in templates', async () => {
      mockTemplateService.deleteTemplate.mockRejectedValue(
        new Error('Cannot delete built-in templates')
      );

      const response = await request(app).delete('/api/admin/templates/discord-basic').expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      mockTemplateService.getAllTemplates.mockRejectedValue(
        new Error('Database connection failed')
      );

      const response = await request(app).get('/api/admin/templates').expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to retrieve templates');
    });

    it('should handle bot creation errors', async () => {
      mockTemplateService.getTemplateById.mockResolvedValue(mockTemplates[0] as any);
      mockBotConfigService.createBotConfig.mockRejectedValue(new Error('Invalid configuration'));

      const response = await request(app)
        .post('/api/admin/templates/discord-basic/apply')
        .send({ name: 'Test Bot' })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to apply template');
    });
  });

  describe('Template Metadata', () => {
    it('should include usage count in template list', async () => {
      mockTemplateService.getAllTemplates.mockResolvedValue(mockTemplates);

      const response = await request(app).get('/api/admin/templates').expect(200);

      expect(response.body.data.templates[0].usageCount).toBe(10);
      expect(response.body.data.templates[1].usageCount).toBe(5);
    });

    it('should increment usage count when template is applied', async () => {
      const mockBot = { id: 'bot-123', name: 'Test Bot' };
      mockTemplateService.getTemplateById.mockResolvedValue(mockTemplates[0] as any);
      mockBotConfigService.createBotConfig.mockResolvedValue(mockBot);
      mockTemplateService.incrementUsageCount.mockResolvedValue();

      await request(app)
        .post('/api/admin/templates/discord-basic/apply')
        .send({ name: 'Test Bot' })
        .expect(200);

      expect(mockTemplateService.incrementUsageCount).toHaveBeenCalledWith('discord-basic');
      expect(mockTemplateService.incrementUsageCount).toHaveBeenCalledTimes(1);
    });
  });
});
