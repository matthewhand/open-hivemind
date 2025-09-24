import { DatabaseManager } from '../../database/DatabaseManager';
import { ConfigurationValidator } from './ConfigurationValidator';
import Debug from 'debug';
import { promises as fs } from 'fs';
import { join } from 'path';

const debug = Debug('app:ConfigurationTemplateService');

export interface ConfigurationTemplate {
  id: string;
  name: string;
  description: string;
  category: 'discord' | 'slack' | 'mattermost' | 'webhook' | 'llm' | 'general';
  tags: string[];
  config: any;
  isBuiltIn: boolean;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
  usageCount: number;
}

export interface CreateTemplateRequest {
  name: string;
  description: string;
  category: 'discord' | 'slack' | 'mattermost' | 'webhook' | 'llm' | 'general';
  tags: string[];
  config: any;
  createdBy?: string;
}

export interface UpdateTemplateRequest {
  name?: string;
  description?: string;
  category?: 'discord' | 'slack' | 'mattermost' | 'webhook' | 'llm' | 'general';
  tags?: string[];
  config?: any;
}

export interface TemplateFilter {
  category?: 'discord' | 'slack' | 'mattermost' | 'webhook' | 'llm' | 'general';
  tags?: string[];
  search?: string;
  isBuiltIn?: boolean;
  createdBy?: string;
}

export class ConfigurationTemplateService {
  private static instance: ConfigurationTemplateService;
  private dbManager: DatabaseManager;
  private configValidator: ConfigurationValidator;
  private templatesDir: string;

  private constructor() {
    this.dbManager = DatabaseManager.getInstance();
    this.configValidator = new ConfigurationValidator();
    this.templatesDir = join(process.cwd(), 'config', 'templates');
    this.ensureTemplatesDirectory();
    this.loadBuiltInTemplates();
  }

  public static getInstance(): ConfigurationTemplateService {
    if (!ConfigurationTemplateService.instance) {
      ConfigurationTemplateService.instance = new ConfigurationTemplateService();
    }
    return ConfigurationTemplateService.instance;
  }

  /**
   * Ensure templates directory exists
   */
  private async ensureTemplatesDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.templatesDir, { recursive: true });
      debug('Templates directory ensured:', this.templatesDir);
    } catch (error) {
      debug('Error creating templates directory:', error);
    }
  }

  /**
   * Load built-in templates
   */
  private async loadBuiltInTemplates(): Promise<void> {
    try {
      const builtInTemplates = this.getBuiltInTemplates();
      
      for (const template of builtInTemplates) {
        const existingTemplate = await this.getTemplateById(template.id);
        if (!existingTemplate) {
          await this.saveTemplate(template);
          debug('Loaded built-in template:', template.name);
        }
      }
    } catch (error) {
      debug('Error loading built-in templates:', error);
    }
  }

  /**
   * Get built-in template definitions
   */
  private getBuiltInTemplates(): ConfigurationTemplate[] {
    const now = new Date();
    
    return [
      {
        id: 'discord-basic',
        name: 'Discord Basic Bot',
        description: 'Basic Discord bot configuration with text commands',
        category: 'discord',
        tags: ['discord', 'basic', 'text'],
        config: {
          messageProvider: 'discord',
          llmProvider: 'flowise',
          discord: {
            token: '${DISCORD_BOT_TOKEN}',
            clientId: '${DISCORD_CLIENT_ID}',
            guildId: '${DISCORD_GUILD_ID}',
            channelId: '${DISCORD_CHANNEL_ID}'
          },
          flowise: {
            apiKey: '${FLOWISE_API_KEY}',
            endpoint: '${FLOWISE_ENDPOINT}'
          }
        },
        isBuiltIn: true,
        createdAt: now,
        updatedAt: now,
        usageCount: 0
      },
      {
        id: 'discord-voice',
        name: 'Discord Voice Bot',
        description: 'Discord bot with voice channel support and speech-to-text',
        category: 'discord',
        tags: ['discord', 'voice', 'advanced'],
        config: {
          messageProvider: 'discord',
          llmProvider: 'openai',
          discord: {
            token: '${DISCORD_BOT_TOKEN}',
            clientId: '${DISCORD_CLIENT_ID}',
            guildId: '${DISCORD_GUILD_ID}',
            channelId: '${DISCORD_CHANNEL_ID}',
            voiceChannelId: '${DISCORD_VOICE_CHANNEL_ID}'
          },
          openai: {
            apiKey: '${OPENAI_API_KEY}',
            model: 'gpt-4'
          }
        },
        isBuiltIn: true,
        createdAt: now,
        updatedAt: now,
        usageCount: 0
      },
      {
        id: 'slack-basic',
        name: 'Slack Basic Bot',
        description: 'Basic Slack bot configuration for team collaboration',
        category: 'slack',
        tags: ['slack', 'basic', 'team'],
        config: {
          messageProvider: 'slack',
          llmProvider: 'openwebui',
          slack: {
            botToken: '${SLACK_BOT_TOKEN}',
            appToken: '${SLACK_APP_TOKEN}',
            signingSecret: '${SLACK_SIGNING_SECRET}',
            mode: 'socket'
          },
          openwebui: {
            apiKey: '${OPENWEBUI_API_KEY}',
            apiUrl: '${OPENWEBUI_API_URL}'
          }
        },
        isBuiltIn: true,
        createdAt: now,
        updatedAt: now,
        usageCount: 0
      },
      {
        id: 'mattermost-integration',
        name: 'Mattermost Integration',
        description: 'Mattermost bot for workplace communication',
        category: 'mattermost',
        tags: ['mattermost', 'workplace', 'integration'],
        config: {
          messageProvider: 'mattermost',
          llmProvider: 'flowise',
          mattermost: {
            serverUrl: '${MATTERMOST_SERVER_URL}',
            token: '${MATTERMOST_TOKEN}',
            team: '${MATTERMOST_TEAM}'
          },
          flowise: {
            apiKey: '${FLOWISE_API_KEY}',
            endpoint: '${FLOWISE_ENDPOINT}'
          }
        },
        isBuiltIn: true,
        createdAt: now,
        updatedAt: now,
        usageCount: 0
      },
      {
        id: 'openai-assistant',
        name: 'OpenAI Assistant',
        description: 'General purpose assistant using OpenAI GPT models',
        category: 'llm',
        tags: ['openai', 'assistant', 'general'],
        config: {
          messageProvider: 'discord',
          llmProvider: 'openai',
          openai: {
            apiKey: '${OPENAI_API_KEY}',
            model: 'gpt-4',
            temperature: 0.7,
            maxTokens: 1000
          },
          discord: {
            token: '${DISCORD_BOT_TOKEN}',
            clientId: '${DISCORD_CLIENT_ID}'
          }
        },
        isBuiltIn: true,
        createdAt: now,
        updatedAt: now,
        usageCount: 0
      },
      {
        id: 'webhook-integration',
        name: 'Webhook Integration',
        description: 'Generic webhook integration for custom messaging',
        category: 'webhook',
        tags: ['webhook', 'integration', 'custom'],
        config: {
          messageProvider: 'webhook',
          llmProvider: 'flowise',
          flowise: {
            apiKey: '${FLOWISE_API_KEY}',
            endpoint: '${FLOWISE_ENDPOINT}'
          }
        },
        isBuiltIn: true,
        createdAt: now,
        updatedAt: now,
        usageCount: 0
      }
    ];
  }

  /**
   * Create a new template
   */
  async createTemplate(request: CreateTemplateRequest): Promise<ConfigurationTemplate> {
    try {
      // Validate template configuration
      const validationResult = this.configValidator.validateBotConfig(request.config);
      if (!validationResult.isValid) {
        throw new Error(`Template configuration validation failed: ${validationResult.errors.join(', ')}`);
      }

      // Check if template name already exists
      const existingTemplate = await this.getTemplateByName(request.name);
      if (existingTemplate) {
        throw new Error(`Template with name '${request.name}' already exists`);
      }

      const template: ConfigurationTemplate = {
        id: this.generateTemplateId(request.name),
        name: request.name,
        description: request.description,
        category: request.category,
        tags: request.tags,
        config: request.config,
        isBuiltIn: false,
        createdBy: request.createdBy,
        createdAt: new Date(),
        updatedAt: new Date(),
        usageCount: 0
      };

      await this.saveTemplate(template);
      debug('Created template:', template.name);
      
      return template;
    } catch (error) {
      debug('Error creating template:', error);
      throw new Error(`Failed to create template: ${error}`);
    }
  }

  /**
   * Update an existing template
   */
  async updateTemplate(templateId: string, request: UpdateTemplateRequest): Promise<ConfigurationTemplate> {
    try {
      const existingTemplate = await this.getTemplateById(templateId);
      if (!existingTemplate) {
        throw new Error(`Template with ID '${templateId}' not found`);
      }

      if (existingTemplate.isBuiltIn) {
        throw new Error('Cannot update built-in templates');
      }

      // Validate new configuration if provided
      if (request.config) {
        const validationResult = this.configValidator.validateBotConfig(request.config);
        if (!validationResult.isValid) {
          throw new Error(`Template configuration validation failed: ${validationResult.errors.join(', ')}`);
        }
      }

      const updatedTemplate: ConfigurationTemplate = {
        ...existingTemplate,
        name: request.name || existingTemplate.name,
        description: request.description || existingTemplate.description,
        category: request.category || existingTemplate.category,
        tags: request.tags || existingTemplate.tags,
        config: request.config || existingTemplate.config,
        updatedAt: new Date()
      };

      await this.saveTemplate(updatedTemplate);
      debug('Updated template:', updatedTemplate.name);
      
      return updatedTemplate;
    } catch (error) {
      debug('Error updating template:', error);
      throw new Error(`Failed to update template: ${error}`);
    }
  }

  /**
   * Delete a template
   */
  async deleteTemplate(templateId: string): Promise<boolean> {
    try {
      const template = await this.getTemplateById(templateId);
      if (!template) {
        throw new Error(`Template with ID '${templateId}' not found`);
      }

      if (template.isBuiltIn) {
        throw new Error('Cannot delete built-in templates');
      }

      const filePath = join(this.templatesDir, `${templateId}.json`);
      await fs.unlink(filePath);
      
      debug('Deleted template:', template.name);
      return true;
    } catch (error) {
      debug('Error deleting template:', error);
      throw new Error(`Failed to delete template: ${error}`);
    }
  }

  /**
   * Get template by ID
   */
  async getTemplateById(templateId: string): Promise<ConfigurationTemplate | null> {
    try {
      const filePath = join(this.templatesDir, `${templateId}.json`);
      const data = await fs.readFile(filePath, 'utf-8');
      const template = JSON.parse(data);
      
      // Convert date strings back to Date objects
      template.createdAt = new Date(template.createdAt);
      template.updatedAt = new Date(template.updatedAt);
      
      return template;
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        return null;
      }
      debug('Error getting template by ID:', error);
      throw new Error(`Failed to get template: ${error}`);
    }
  }

  /**
   * Get template by name
   */
  async getTemplateByName(name: string): Promise<ConfigurationTemplate | null> {
    try {
      const templates = await this.getAllTemplates();
      return templates.find(template => template.name === name) || null;
    } catch (error) {
      debug('Error getting template by name:', error);
      throw new Error(`Failed to get template by name: ${error}`);
    }
  }

  /**
   * Get all templates with optional filtering
   */
  async getAllTemplates(filter?: TemplateFilter): Promise<ConfigurationTemplate[]> {
    try {
      const files = await fs.readdir(this.templatesDir);
      const templates: ConfigurationTemplate[] = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const filePath = join(this.templatesDir, file);
            const data = await fs.readFile(filePath, 'utf-8');
            const template = JSON.parse(data);
            
            // Convert date strings back to Date objects
            template.createdAt = new Date(template.createdAt);
            template.updatedAt = new Date(template.updatedAt);
            
            // Apply filters
            if (this.matchesFilter(template, filter)) {
              templates.push(template);
            }
          } catch (error) {
            debug('Error loading template file:', file, error);
          }
        }
      }

      return templates.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    } catch (error) {
      debug('Error getting all templates:', error);
      throw new Error(`Failed to get templates: ${error}`);
    }
  }

  /**
   * Get templates by category
   */
  async getTemplatesByCategory(category: string): Promise<ConfigurationTemplate[]> {
    return this.getAllTemplates({ category: category as any });
  }

  /**
   * Get popular templates (by usage count)
   */
  async getPopularTemplates(limit: number = 10): Promise<ConfigurationTemplate[]> {
    const templates = await this.getAllTemplates();
    return templates
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, limit);
  }

  /**
   * Get recently created templates
   */
  async getRecentTemplates(limit: number = 10): Promise<ConfigurationTemplate[]> {
    const templates = await this.getAllTemplates();
    return templates
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  /**
   * Increment template usage count
   */
  async incrementUsageCount(templateId: string): Promise<void> {
    try {
      const template = await this.getTemplateById(templateId);
      if (!template) {
        return;
      }

      template.usageCount += 1;
      template.updatedAt = new Date();
      
      await this.saveTemplate(template);
      debug('Incremented usage count for template:', template.name);
    } catch (error) {
      debug('Error incrementing template usage count:', error);
    }
  }

  /**
   * Duplicate a template
   */
  async duplicateTemplate(templateId: string, newName: string, createdBy?: string): Promise<ConfigurationTemplate> {
    try {
      const originalTemplate = await this.getTemplateById(templateId);
      if (!originalTemplate) {
        throw new Error(`Template with ID '${templateId}' not found`);
      }

      const duplicateTemplate: ConfigurationTemplate = {
        ...originalTemplate,
        id: this.generateTemplateId(newName),
        name: newName,
        description: `${originalTemplate.description} (Copy)`,
        isBuiltIn: false,
        createdBy,
        createdAt: new Date(),
        updatedAt: new Date(),
        usageCount: 0
      };

      await this.saveTemplate(duplicateTemplate);
      debug('Duplicated template:', originalTemplate.name, 'as', newName);
      
      return duplicateTemplate;
    } catch (error) {
      debug('Error duplicating template:', error);
      throw new Error(`Failed to duplicate template: ${error}`);
    }
  }

  /**
   * Export template to JSON
   */
  async exportTemplate(templateId: string): Promise<string> {
    try {
      const template = await this.getTemplateById(templateId);
      if (!template) {
        throw new Error(`Template with ID '${templateId}' not found`);
      }

      return JSON.stringify(template, null, 2);
    } catch (error) {
      debug('Error exporting template:', error);
      throw new Error(`Failed to export template: ${error}`);
    }
  }

  /**
   * Import template from JSON
   */
  async importTemplate(jsonData: string, createdBy?: string): Promise<ConfigurationTemplate> {
    try {
      const templateData = JSON.parse(jsonData);
      
      // Validate template structure
      if (!templateData.name || !templateData.config) {
        throw new Error('Invalid template format');
      }

      // Remove ID to generate a new one
      delete templateData.id;
      
      const request: CreateTemplateRequest = {
        name: templateData.name,
        description: templateData.description || '',
        category: templateData.category || 'general',
        tags: templateData.tags || [],
        config: templateData.config,
        createdBy
      };

      return this.createTemplate(request);
    } catch (error) {
      debug('Error importing template:', error);
      throw new Error(`Failed to import template: ${error}`);
    }
  }

  /**
   * Save template to file
   */
  private async saveTemplate(template: ConfigurationTemplate): Promise<void> {
    const filePath = join(this.templatesDir, `${template.id}.json`);
    const data = JSON.stringify(template, null, 2);
    await fs.writeFile(filePath, data, 'utf-8');
  }

  /**
   * Generate template ID from name
   */
  private generateTemplateId(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      + '-' + Date.now().toString(36);
  }

  /**
   * Check if template matches filter
   */
  private matchesFilter(template: ConfigurationTemplate, filter?: TemplateFilter): boolean {
    if (!filter) return true;

    if (filter.category && template.category !== filter.category) {
      return false;
    }

    if (filter.isBuiltIn !== undefined && template.isBuiltIn !== filter.isBuiltIn) {
      return false;
    }

    if (filter.createdBy && template.createdBy !== filter.createdBy) {
      return false;
    }

    if (filter.tags && filter.tags.length > 0) {
      const hasMatchingTag = filter.tags.some(tag => 
        template.tags.some(templateTag => 
          templateTag.toLowerCase().includes(tag.toLowerCase())
        )
      );
      if (!hasMatchingTag) return false;
    }

    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      const searchableText = [
        template.name,
        template.description,
        ...template.tags,
        template.category
      ].join(' ').toLowerCase();
      
      if (!searchableText.includes(searchLower)) {
        return false;
      }
    }

    return true;
  }
}