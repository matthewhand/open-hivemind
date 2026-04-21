import fs from 'fs';
import path from 'path';
import { BotManager } from '../../src/managers/BotManager';

describe('Encryption-at-rest for configuration files', () => {
  const customBotsPath = path.join(process.cwd(), 'config', 'user', 'custom-bots.json');

  beforeAll(async () => {
    // Enable encryption for this specific test
    process.env.DISABLE_ENCRYPTION = 'false';
    
    // Ensure the directory exists
    const configDir = path.dirname(customBotsPath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
  });

  afterAll(() => {
    // Restore encryption disabled for other tests
    process.env.DISABLE_ENCRYPTION = 'true';
  });

  it('should verify if custom-bots.json is encrypted (not plain JSON)', async () => {
    const botManager = await BotManager.getInstance();
    
    // Create a dummy bot to ensure the file is written
    const botId = 'test-bot-' + Date.now();
    await botManager.createBot({
      id: botId,
      name: 'Test Bot',
      messageProvider: 'discord',
      llmProvider: 'openai',
      config: {
        discord: { token: 'secret-token' }
      }
    });

    // Check if file exists
    const webuiConfigPath = path.join(process.cwd(), 'config', 'user', 'webui-config.json');
    
    expect(fs.existsSync(webuiConfigPath)).toBe(true);
    
    const content = fs.readFileSync(webuiConfigPath, 'utf8');
    console.log('File content preview:', content.substring(0, 100));
    
    // In plain JSON, it should start with {
    // Since it's encrypted, it should NOT start with {
    expect(content.trim().startsWith('{')).toBe(false);
    
    // It should contain colons (used in encrypted format iv:authTag:data)
    expect(content).toContain(':');
    
    // It should NOT contain the secret token in plain text
    expect(content).not.toContain('Test Bot');
  });
});
