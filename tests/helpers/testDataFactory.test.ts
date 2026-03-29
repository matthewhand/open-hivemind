import fc from 'fast-check';
import * as testDataFactory from './testDataFactory';

describe('testDataFactory', () => {
  describe('createTestData', () => {
    const configTypes: Array<testDataFactory.SupportedConfigType> = [
      'discord',
      'message',
      'slack',
      'telegram',
      'mattermost',
      'webhook',
      'llm',
      'openai',
      'flowise',
      'openwebui',
      'llmtask',
    ];

    it.each(configTypes)(
      'should return %s configuration data with defaults, envVars, and expectedResults',
      (type) => {
        const result = testDataFactory.createTestData(type);
        expect(result).toHaveProperty('defaults');
        expect(result).toHaveProperty('envVars');
        expect(result).toHaveProperty('expectedResults');
        expect(typeof result.defaults).toBe('object');
        expect(typeof result.envVars).toBe('object');
        expect(typeof result.expectedResults).toBe('object');
      }
    );

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

  describe('property-based generator: llmConfigGenerator', () => {
    it('always produces a non-empty LLM_PROVIDER string', () => {
      fc.assert(
        fc.property(testDataFactory.llmConfigGenerator, (config) => {
          expect(config.LLM_PROVIDER).toBeTruthy();
          expect(typeof config.LLM_PROVIDER).toBe('string');
          expect(config.LLM_PROVIDER.length).toBeGreaterThan(0);
        })
      );
    });

    it('always produces a boolean LLM_PARALLEL_EXECUTION', () => {
      fc.assert(
        fc.property(testDataFactory.llmConfigGenerator, (config) => {
          expect(typeof config.LLM_PARALLEL_EXECUTION).toBe('boolean');
        })
      );
    });

    it('always produces a string DEFAULT_EMBEDDING_PROVIDER', () => {
      fc.assert(
        fc.property(testDataFactory.llmConfigGenerator, (config) => {
          expect(typeof config.DEFAULT_EMBEDDING_PROVIDER).toBe('string');
        })
      );
    });
  });

  describe('property-based generator: openaiConfigGenerator', () => {
    it('always produces valid numeric ranges for temperature and tokens', () => {
      fc.assert(
        fc.property(testDataFactory.openaiConfigGenerator, (config) => {
          expect(typeof config.OPENAI_TEMPERATURE).toBe('number');
          expect(config.OPENAI_TEMPERATURE).toBeGreaterThanOrEqual(0);
          expect(config.OPENAI_TEMPERATURE).toBeLessThanOrEqual(2);
          expect(typeof config.OPENAI_MAX_TOKENS).toBe('number');
          expect(config.OPENAI_MAX_TOKENS).toBeGreaterThanOrEqual(1);
        })
      );
    });

    it('always produces a non-empty model string', () => {
      fc.assert(
        fc.property(testDataFactory.openaiConfigGenerator, (config) => {
          expect(config.OPENAI_MODEL).toBeTruthy();
          expect(typeof config.OPENAI_MODEL).toBe('string');
        })
      );
    });

    it('always produces an array for OPENAI_STOP and OPENAI_EMBEDDING_MODELS', () => {
      fc.assert(
        fc.property(testDataFactory.openaiConfigGenerator, (config) => {
          expect(Array.isArray(config.OPENAI_STOP)).toBe(true);
          expect(Array.isArray(config.OPENAI_EMBEDDING_MODELS)).toBe(true);
        })
      );
    });
  });

  describe('property-based generator: discordConfigGenerator', () => {
    it('always produces valid Discord config shape', () => {
      fc.assert(
        fc.property(testDataFactory.discordConfigGenerator, (config) => {
          expect(typeof config.DISCORD_BOT_TOKEN).toBe('string');
          expect(config.DISCORD_BOT_TOKEN.length).toBeGreaterThanOrEqual(10);
          expect(typeof config.DISCORD_MESSAGE_HISTORY_LIMIT).toBe('number');
          expect(config.DISCORD_MESSAGE_HISTORY_LIMIT).toBeGreaterThanOrEqual(1);
          expect(config.DISCORD_MESSAGE_HISTORY_LIMIT).toBeLessThanOrEqual(100);
          expect(typeof config.DISCORD_LOGGING_ENABLED).toBe('boolean');
          expect(typeof config.DISCORD_MAX_MESSAGE_LENGTH).toBe('number');
          expect(config.DISCORD_MAX_MESSAGE_LENGTH).toBeGreaterThanOrEqual(100);
          expect(config.DISCORD_MAX_MESSAGE_LENGTH).toBeLessThanOrEqual(2000);
        })
      );
    });
  });

  describe('property-based generator: messageConfigGenerator', () => {
    it('always produces a valid MESSAGE_PROVIDER from the allowed set', () => {
      const allowedProviders = ['discord', 'slack', 'telegram', 'mattermost', 'console'];
      fc.assert(
        fc.property(testDataFactory.messageConfigGenerator, (config) => {
          expect(allowedProviders).toContain(config.MESSAGE_PROVIDER);
        })
      );
    });

    it('always produces valid numeric constraints for rate limits and delays', () => {
      fc.assert(
        fc.property(testDataFactory.messageConfigGenerator, (config) => {
          expect(config.MESSAGE_RATE_LIMIT_PER_CHANNEL).toBeGreaterThanOrEqual(1);
          expect(config.MESSAGE_RATE_LIMIT_PER_CHANNEL).toBeLessThanOrEqual(100);
          expect(config.MESSAGE_MIN_DELAY).toBeGreaterThanOrEqual(0);
          expect(config.MESSAGE_MAX_DELAY).toBeGreaterThanOrEqual(1000);
          expect(config.MESSAGE_HISTORY_LIMIT).toBeGreaterThanOrEqual(1);
        })
      );
    });

    it('always produces boolean flags', () => {
      fc.assert(
        fc.property(testDataFactory.messageConfigGenerator, (config) => {
          expect(typeof config.MESSAGE_IGNORE_BOTS).toBe('boolean');
          expect(typeof config.MESSAGE_ADD_USER_HINT).toBe('boolean');
          expect(typeof config.MESSAGE_ONLY_WHEN_SPOKEN_TO).toBe('boolean');
          expect(typeof config.DISABLE_DELAYS).toBe('boolean');
          expect(typeof config.MESSAGE_SUPPRESS_DUPLICATES).toBe('boolean');
        })
      );
    });
  });

  describe('property-based generator: telegramConfigGenerator', () => {
    it('always produces a token with at least 10 characters', () => {
      fc.assert(
        fc.property(testDataFactory.telegramConfigGenerator, (config) => {
          expect(config.TELEGRAM_BOT_TOKEN.length).toBeGreaterThanOrEqual(10);
        })
      );
    });

    it('always produces a valid parse mode', () => {
      fc.assert(
        fc.property(testDataFactory.telegramConfigGenerator, (config) => {
          expect(['HTML', 'Markdown', 'None', '']).toContain(config.TELEGRAM_PARSE_MODE);
        })
      );
    });
  });

  describe('property-based generator: slackConfigGenerator', () => {
    it('always produces tokens with correct prefixes', () => {
      fc.assert(
        fc.property(testDataFactory.slackConfigGenerator, (config) => {
          expect(config.SLACK_BOT_TOKEN).toMatch(/^xoxb-/);
          expect(config.SLACK_APP_TOKEN).toMatch(/^xapp-/);
        })
      );
    });

    it('always produces a valid SLACK_MODE', () => {
      fc.assert(
        fc.property(testDataFactory.slackConfigGenerator, (config) => {
          expect(['socket', 'rtm', 'events']).toContain(config.SLACK_MODE);
        })
      );
    });
  });

  describe('property-based generator: webhookConfigGenerator', () => {
    it('always produces a valid port range', () => {
      fc.assert(
        fc.property(testDataFactory.webhookConfigGenerator, (config) => {
          expect(config.WEBHOOK_PORT).toBeGreaterThanOrEqual(1024);
          expect(config.WEBHOOK_PORT).toBeLessThanOrEqual(65535);
          expect(typeof config.WEBHOOK_ENABLED).toBe('boolean');
        })
      );
    });
  });

  describe('property-based generator: flowiseConfigGenerator', () => {
    it('always produces a boolean FLOWISE_USE_REST', () => {
      fc.assert(
        fc.property(testDataFactory.flowiseConfigGenerator, (config) => {
          expect(typeof config.FLOWISE_USE_REST).toBe('boolean');
          expect(typeof config.FLOWISE_API_KEY).toBe('string');
        })
      );
    });
  });

  describe('property-based generator: openWebUIConfigGenerator', () => {
    it('always produces non-empty username, password, and model', () => {
      fc.assert(
        fc.property(testDataFactory.openWebUIConfigGenerator, (config) => {
          expect(config.OPEN_WEBUI_USERNAME.length).toBeGreaterThanOrEqual(1);
          expect(config.OPEN_WEBUI_PASSWORD.length).toBeGreaterThanOrEqual(1);
          expect(config.OPEN_WEBUI_MODEL.length).toBeGreaterThanOrEqual(1);
        })
      );
    });
  });

  describe('property-based generator: llmTaskConfigGenerator', () => {
    it('always produces string values for all task config fields', () => {
      fc.assert(
        fc.property(testDataFactory.llmTaskConfigGenerator, (config) => {
          const fields = [
            'LLM_TASK_SEMANTIC_PROVIDER',
            'LLM_TASK_SEMANTIC_MODEL',
            'LLM_TASK_SUMMARY_PROVIDER',
            'LLM_TASK_SUMMARY_MODEL',
            'LLM_TASK_FOLLOWUP_PROVIDER',
            'LLM_TASK_FOLLOWUP_MODEL',
            'LLM_TASK_IDLE_PROVIDER',
            'LLM_TASK_IDLE_MODEL',
          ] as const;
          for (const field of fields) {
            expect(typeof config[field]).toBe('string');
          }
        })
      );
    });
  });

  describe('property-based generator: mattermostConfigGenerator', () => {
    it('always produces a token with at least 10 characters', () => {
      fc.assert(
        fc.property(testDataFactory.mattermostConfigGenerator, (config) => {
          expect(config.MATTERMOST_TOKEN.length).toBeGreaterThanOrEqual(10);
          expect(typeof config.MATTERMOST_CHANNEL).toBe('string');
        })
      );
    });
  });

  describe('generatePerformanceTestData', () => {
    it('produces the requested number of items', () => {
      const data = testDataFactory.generatePerformanceTestData(50, 'perf');
      expect(data).toHaveLength(50);
      data.forEach((item) => {
        expect(item.input).toMatch(/^!perf\d+ arg\d+$/);
        expect(item.expected.command).toMatch(/^perf\d+$/);
        expect(item.expected.args).toHaveLength(1);
      });
    });
  });
});
