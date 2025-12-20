const { register } = require('ts-node');
const { register: registerPaths } = require('tsconfig-paths');

// Load tsconfig.json
const tsconfig = require('./tsconfig.json');

// Register the paths
registerPaths({
  baseUrl: tsconfig.compilerOptions.baseUrl || './',
  paths: tsconfig.compilerOptions.paths || {}
});

// Register ts-node
register({
  project: './tsconfig.json'
});

// Try to import the modules
try {
  const getMessengerProvider = require('@message/management/getMessengerProvider');
  console.log('getMessengerProvider loaded successfully');
} catch (e) {
  console.error('Error loading getMessengerProvider:', e.message);
}

try {
  const messageHandler = require('@message/handlers/messageHandler');
  console.log('messageHandler loaded successfully');
} catch (e) {
  console.error('Error loading messageHandler:', e.message);
}

try {
  const debugEnvVars = require('@config/debugEnvVars');
  console.log('debugEnvVars loaded successfully');
} catch (e) {
  console.error('Error loading debugEnvVars:', e.message);
}

try {
  const messageConfig = require('@config/messageConfig');
  console.log('messageConfig loaded successfully');
} catch (e) {
  console.error('Error loading messageConfig:', e.message);
}

try {
  const webhookConfig = require('@config/webhookConfig');
  console.log('webhookConfig loaded successfully');
} catch (e) {
  console.error('Error loading webhookConfig:', e.message);
}

try {
  const webhookService = require('@webhook/webhookService');
  console.log('webhookService loaded successfully');
} catch (e) {
  console.error('Error loading webhookService:', e.message);
}

try {
  const getLlmProvider = require('@llm/getLlmProvider');
  console.log('getLlmProvider loaded successfully');
} catch (e) {
  console.error('Error loading getLlmProvider:', e.message);
}

try {
  const IdleResponseManager = require('@message/management/IdleResponseManager');
  console.log('IdleResponseManager loaded successfully');
} catch (e) {
  console.error('Error loading IdleResponseManager:', e.message);
}