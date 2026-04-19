describe('Global Config Sanity', () => {
  const configModules = [
    '../../src/config/llmConfig',
    '../../src/config/messageConfig',
    '../../src/config/webhookConfig',
    '../../src/config/rateLimitConfig',
    '../../src/config/ConfigurationManager',
    '../../src/config/BotConfigurationManager',
    '../../src/config/ProviderConfigManager',
    '../../src/config/SecureConfigManager',
  ];

  configModules.forEach(modulePath => {
    it(`should load ${modulePath} without errors`, () => {
      expect(() => {
        const module = require(modulePath);
        // If it's a class with getInstance, try calling it
        if (module.default && typeof module.default.getInstance === 'function') {
          module.default.getInstance();
        } else if (module.ConfigurationManager && typeof module.ConfigurationManager.getInstance === 'function') {
          module.ConfigurationManager.getInstance();
        } else if (module.BotConfigurationManager && typeof module.BotConfigurationManager.getInstance === 'function') {
          module.BotConfigurationManager.getInstance();
        }
      }).not.toThrow();
    });
  });
});
