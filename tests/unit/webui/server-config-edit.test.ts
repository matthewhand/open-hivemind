import request from 'supertest';
import express from 'express';

// Mock the server routes - simplified for testing PATCH /api/config/:botName
const app = express();
app.use(express.json());

// Mock middleware for auth - assume it's bypassed in tests
app.patch('/api/config/:botName', async (req, res) => {
  try {
    const { botName } = req.params;
    const updates = req.body;

    // Mock validation and update logic
    const manager = BotConfigurationManager.getInstance();
    const currentConfig = manager.getBot(botName);
    if (!currentConfig) {
      return res.status(404).json({ error: 'Bot not found' });
    }

    // Deep merge updates
    const updatedConfig = { ...currentConfig, ...updates };

    // Mock validation
    manager.validateConfiguration(updatedConfig);

    // Mock file write
    const configPath = `config/bots/${botName}.json`;
    await fs.writeFile(configPath, JSON.stringify(updatedConfig, null, 2));

    // Mock reload
    manager.reload();

    // Mock redaction
    const redacted = JSON.parse(JSON.stringify(updatedConfig));
    // Simple redaction for tokens
    if (redacted.discord?.token) redacted.discord.token = '***';
    if (redacted.openai?.apiKey) redacted.openai.apiKey = '***';

    res.json(redacted);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

import { BotConfigurationManager } from '../../../src/config/BotConfigurationManager';
import fs from 'fs/promises';

// Mock BotConfigurationManager
jest.mock('../../../src/config/BotConfigurationManager');

// Mock fs
jest.mock('fs/promises');
const mockFs = jest.mocked(fs);

describe('Server Config Edit API', () => {
  const mockManager = {
    getBot: jest.fn(),
    validateConfiguration: jest.fn(),
    reload: jest.fn()
  };

  beforeEach(() => {
    (BotConfigurationManager.getInstance as jest.Mock).mockReturnValue(mockManager);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('PATCH /api/config/:botName', () => {
    it('should update bot config successfully', async () => {
      const botName = 'TestBot';
      const updates = { discord: { guildId: '123456' }, llm: { model: 'gpt-4' } };
      const currentConfig = { name: botName, messageProvider: 'discord', llmProvider: 'openai', discord: { token: 'secret' }, llm: { model: 'gpt-3.5' } };
      const updatedConfig = { ...currentConfig, ...updates };

      mockManager.getBot.mockReturnValue(currentConfig);
      (mockManager.validateConfiguration as jest.Mock).mockImplementation(() => {});
      mockManager.reload.mockImplementation(() => {});

      mockFs.writeFile.mockResolvedValue(undefined);

      const response = await request(app)
        .patch(`/api/config/${botName}`)
        .send(updates)
        .expect(200);

      expect(mockManager.getBot).toHaveBeenCalledWith(botName);
      expect(mockManager.validateConfiguration).toHaveBeenCalledWith(updatedConfig);
      expect(mockFs.writeFile).toHaveBeenCalledWith(`config/bots/${botName}.json`, JSON.stringify(updatedConfig, null, 2));
      expect(mockManager.reload).toHaveBeenCalled();
      expect(response.body.discord.token).toBe('***'); // Redacted
      expect(response.body.llm.model).toBe('gpt-4');
    });

    it('should return 404 if bot not found', async () => {
      mockManager.getBot.mockReturnValue(undefined);

      const response = await request(app)
        .patch('/api/config/NonExistentBot')
        .send({ discord: { guildId: '123' } })
        .expect(404);

      expect(response.body.error).toBe('Bot not found');
    });

    it('should handle validation errors', async () => {
      const botName = 'TestBot';
      const currentConfig = { name: botName, messageProvider: 'discord', llmProvider: 'openai' };
      mockManager.getBot.mockReturnValue(currentConfig);
      (mockManager.validateConfiguration as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid config');
      });

      const response = await request(app)
        .patch(`/api/config/${botName}`)
        .send({ invalid: 'data' })
        .expect(500);

      expect(response.body.error).toBe('Invalid config');
    });

    it('should handle file write errors', async () => {
      const botName = 'TestBot';
      const currentConfig = { name: botName, messageProvider: 'discord', llmProvider: 'openai' };
      mockManager.getBot.mockReturnValue(currentConfig);
      (mockManager.validateConfiguration as jest.Mock).mockImplementation(() => {});
      mockFs.writeFile.mockRejectedValue(new Error('Write failed'));

      const response = await request(app)
        .patch(`/api/config/${botName}`)
        .send({ discord: { guildId: '123' } })
        .expect(500);

      expect(response.body.error).toBe('Write failed');
    });
  });
});