// Simulate what the tests are doing
console.log('Initial environment variables:', process.env.NODE_CONFIG_DIR, process.env.NODE_ENV);

// Save original environment variables
const OLD_ENV = process.env;

// Reset environment variables to test defaults (like the tests do)
process.env = {};

console.log('Environment variables after reset:', process.env);

// Reset modules to force re-import of config with new environment
// Note: We can't use jest.resetModules() here, but we can delete the module from cache
delete require.cache[require.resolve('./dist/config/messageConfig')];

try {
  // Let's also check what the configDir and configPath are
  const path = require('path');
  const configDir = process.env.NODE_CONFIG_DIR || path.join(__dirname, '../config');
  const configPath = path.join(configDir, 'providers/message.json');
  console.log('Config dir:', configDir);
  console.log('Config path:', configPath);
  
  const freshMessageConfig = require('./dist/config/messageConfig').default;
  
  console.log('MESSAGE_PROVIDER:', freshMessageConfig.get('MESSAGE_PROVIDER'));
  console.log('MESSAGE_IGNORE_BOTS:', freshMessageConfig.get('MESSAGE_IGNORE_BOTS'));
  console.log('MESSAGE_WAKEWORDS:', freshMessageConfig.get('MESSAGE_WAKEWORDS'));
  
  // Restore original environment variables
  process.env = OLD_ENV;
} catch (error) {
  console.error('Error loading config:', error);
  // Restore original environment variables
  process.env = OLD_ENV;
}