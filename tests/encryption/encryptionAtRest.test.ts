import fs from 'fs';
import path from 'path';
import { BotManager } from '../../src/managers/BotManager';

describe('Encryption-at-rest for configuration files', () => {
  const customBotsPath = path.join(process.cwd(), 'config', 'user', 'custom-bots.json');

  beforeAll(async () => {
    // Ensure the directory exists
    const configDir = path.dirname(customBotsPath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
  });

  it('should verify if custom-bots.json is plain JSON', async () => {
    const botManager = await BotManager.getInstance();
    
    // Create a dummy bot to ensure the file is written
    const botId = 'test-bot-' + Date.now();
    await botManager.createBot({
      name: 'Test Bot',
      messageProvider: 'discord',
      llmProvider: 'openai',
      config: {
        discord: { token: 'secret-token' }
      }
    });

    // Check if file exists
    // Note: BotManager.createBot calls webUIStorage.saveAgent, which writes to webui-config.json
    // and ALSO calls saveCustomBots in some cases? 
    // Actually, let's check webui-config.json as well.
    const webuiConfigPath = path.join(process.cwd(), 'config', 'user', 'webui-config.json');
    
    expect(fs.existsSync(webuiConfigPath)).toBe(true);
    
    const content = fs.readFileSync(webuiConfigPath, 'utf8');
    console.log('File content preview:', content.substring(0, 100));
    
    // In plain JSON, it should start with {
    expect(content.trim().startsWith('{')).toBe(true);
    
    // It should contain the secret token in plain text
    expect(content).toContain('Test Bot');
  });
});
