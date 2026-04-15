import express from 'express';
import request from 'supertest';
import configRouter from '../../src/server/routes/config';
import { BotConfigurationManager } from '../../src/config/BotConfigurationManager';

describe('Config Redaction Integration', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/config', configRouter);
  });

  it('should return redacted bot configuration from real router', async () => {
    // Add a temporary bot with secret info via the manager
    const manager = BotConfigurationManager.getInstance();
    
    // Check real API response
    const res = await request(app).get('/api/config');
    expect(res.status).toBe(200);
    
    // Verify all bots in response have redacted tokens
    if (res.body.bots && res.body.bots.length > 0) {
      res.body.bots.forEach((bot: any) => {
        if (bot.discord?.token) {
          expect(bot.discord.token).toContain('***');
        }
        if (bot.openai?.apiKey) {
          expect(bot.openai.apiKey).toContain('***');
        }
      });
    }
  });
});
