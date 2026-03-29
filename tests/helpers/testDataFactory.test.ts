import * as testDataFactory from './testDataFactory';

describe('testDataFactory', () => {
  describe('createTestData', () => {
    it('should return discord configuration data', () => {
      const result = testDataFactory.createTestData('discord');
      expect(result).toHaveProperty('defaults');
      expect(result).toHaveProperty('envVars');
      expect(result).toHaveProperty('expectedResults');
      expect(result.expectedResults).toHaveProperty('DISCORD_BOT_TOKEN');
    });

    it('should return message configuration data', () => {
      const result = testDataFactory.createTestData('message');
      expect(result).toHaveProperty('defaults');
      expect(result).toHaveProperty('envVars');
      expect(result).toHaveProperty('expectedResults');
      expect(result.expectedResults).toHaveProperty('MESSAGE_PROVIDER');
    });

    it('should return slack configuration data', () => {
      const result = testDataFactory.createTestData('slack');
      expect(result).toHaveProperty('defaults');
      expect(result).toHaveProperty('envVars');
      expect(result).toHaveProperty('expectedResults');
      expect(result.expectedResults).toHaveProperty('SLACK_BOT_TOKEN');
    });

    it('should return telegram configuration data', () => {
      const result = testDataFactory.createTestData('telegram');
      expect(result).toHaveProperty('defaults');
      expect(result).toHaveProperty('envVars');
      expect(result).toHaveProperty('expectedResults');
      expect(result.expectedResults).toHaveProperty('TELEGRAM_BOT_TOKEN');
    });

    it('should return mattermost configuration data', () => {
      const result = testDataFactory.createTestData('mattermost');
      expect(result).toHaveProperty('defaults');
      expect(result).toHaveProperty('envVars');
      expect(result).toHaveProperty('expectedResults');
      expect(result.expectedResults).toHaveProperty('MATTERMOST_SERVER_URL');
    });

    it('should return webhook configuration data', () => {
      const result = testDataFactory.createTestData('webhook');
      expect(result).toHaveProperty('defaults');
      expect(result).toHaveProperty('envVars');
      expect(result).toHaveProperty('expectedResults');
      expect(result.expectedResults).toHaveProperty('WEBHOOK_ENABLED');
    });

    it('should return llm configuration data', () => {
      const result = testDataFactory.createTestData('llm');
      expect(result).toHaveProperty('defaults');
      expect(result).toHaveProperty('envVars');
      expect(result).toHaveProperty('expectedResults');
      expect(result.expectedResults).toHaveProperty('LLM_PROVIDER');
    });

    it('should return openai configuration data', () => {
      const result = testDataFactory.createTestData('openai');
      expect(result).toHaveProperty('defaults');
      expect(result).toHaveProperty('envVars');
      expect(result).toHaveProperty('expectedResults');
      expect(result.expectedResults).toHaveProperty('OPENAI_API_KEY');
    });

    it('should return flowise configuration data', () => {
      const result = testDataFactory.createTestData('flowise');
      expect(result).toHaveProperty('defaults');
      expect(result).toHaveProperty('envVars');
      expect(result).toHaveProperty('expectedResults');
      expect(result.expectedResults).toHaveProperty('FLOWISE_API_ENDPOINT');
    });

    it('should return openwebui configuration data', () => {
      const result = testDataFactory.createTestData('openwebui');
      expect(result).toHaveProperty('defaults');
      expect(result).toHaveProperty('envVars');
      expect(result).toHaveProperty('expectedResults');
      expect(result.expectedResults).toHaveProperty('OPEN_WEBUI_API_URL');
    });

    it('should return llmtask configuration data', () => {
      const result = testDataFactory.createTestData('llmtask');
      expect(result).toHaveProperty('defaults');
      expect(result).toHaveProperty('envVars');
      expect(result).toHaveProperty('expectedResults');
      expect(result.expectedResults).toHaveProperty('LLM_TASK_SEMANTIC_PROVIDER');
    });

    it('should return command parser test data', () => {
      const result = testDataFactory.createTestData('command');
      expect(result).toHaveProperty('validCommands');
      expect(result).toHaveProperty('invalidInputs');
      expect(result).toHaveProperty('edgeCases');
      expect(result).toHaveProperty('performanceTestData');
    });

    it('should throw an error for unknown configuration type', () => {
      expect(() => {
        testDataFactory.createTestData('unknown_type' as any);
      }).toThrow('Unknown test data type: unknown_type');
    });
  });

  describe('validateConfigAgainstSchema', () => {
    it('should correctly validate valid discord config', () => {
      expect(() => {
        testDataFactory.validateConfigAgainstSchema(
          'discord',
          testDataFactory.discordConfigData.expectedResults
        );
      }).not.toThrow();
    });

    it('should correctly validate valid message config', () => {
      expect(() => {
        testDataFactory.validateConfigAgainstSchema(
          'message',
          testDataFactory.messageConfigData.expectedResults
        );
      }).not.toThrow();
    });

    it('should correctly validate valid slack config', () => {
      expect(() => {
        testDataFactory.validateConfigAgainstSchema(
          'slack',
          testDataFactory.slackConfigData.expectedResults
        );
      }).not.toThrow();
    });

    it('should correctly validate valid telegram config', () => {
      expect(() => {
        testDataFactory.validateConfigAgainstSchema(
          'telegram',
          testDataFactory.telegramConfigData.expectedResults
        );
      }).not.toThrow();
    });

    it('should correctly validate valid mattermost config', () => {
      expect(() => {
        testDataFactory.validateConfigAgainstSchema(
          'mattermost',
          testDataFactory.mattermostConfigData.expectedResults
        );
      }).not.toThrow();
    });

    it('should correctly validate valid webhook config', () => {
      expect(() => {
        testDataFactory.validateConfigAgainstSchema(
          'webhook',
          testDataFactory.webhookConfigData.expectedResults
        );
      }).not.toThrow();
    });

    it('should correctly validate valid llm config', () => {
      expect(() => {
        testDataFactory.validateConfigAgainstSchema(
          'llm',
          testDataFactory.llmConfigData.expectedResults
        );
      }).not.toThrow();
    });

    it('should correctly validate valid openai config', () => {
      expect(() => {
        testDataFactory.validateConfigAgainstSchema(
          'openai',
          testDataFactory.openaiConfigData.expectedResults
        );
      }).not.toThrow();
    });

    it('should correctly validate valid flowise config', () => {
      expect(() => {
        testDataFactory.validateConfigAgainstSchema(
          'flowise',
          testDataFactory.flowiseConfigData.expectedResults
        );
      }).not.toThrow();
    });

    it('should correctly validate valid openwebui config', () => {
      expect(() => {
        testDataFactory.validateConfigAgainstSchema(
          'openwebui',
          testDataFactory.openWebUIConfigData.expectedResults
        );
      }).not.toThrow();
    });

    it('should correctly validate valid llmtask config', () => {
      expect(() => {
        testDataFactory.validateConfigAgainstSchema(
          'llmtask',
          testDataFactory.llmTaskConfigData.expectedResults
        );
      }).not.toThrow();
    });

    it('should throw an error for malformed discord config', () => {
      expect(() => {
        testDataFactory.validateConfigAgainstSchema('discord', { DISCORD_BOT_TOKEN: 12345 });
      }).toThrow(/Test data validation failed for discord/);
    });

    it('should throw an error for an unknown configuration type', () => {
      expect(() => {
        testDataFactory.validateConfigAgainstSchema('unknown_type' as any, {});
      }).toThrow();
    });
  });

  describe('property-based test generators', () => {
    it('should export all required fast-check generators', () => {
      expect(testDataFactory.discordConfigGenerator).toBeDefined();
      expect(testDataFactory.messageConfigGenerator).toBeDefined();
      expect(testDataFactory.telegramConfigGenerator).toBeDefined();
      expect(testDataFactory.slackConfigGenerator).toBeDefined();
      expect(testDataFactory.mattermostConfigGenerator).toBeDefined();
      expect(testDataFactory.webhookConfigGenerator).toBeDefined();
      expect(testDataFactory.llmConfigGenerator).toBeDefined();
      expect(testDataFactory.openaiConfigGenerator).toBeDefined();
      expect(testDataFactory.flowiseConfigGenerator).toBeDefined();
      expect(testDataFactory.openWebUIConfigGenerator).toBeDefined();
      expect(testDataFactory.llmTaskConfigGenerator).toBeDefined();
    });
  });
});
