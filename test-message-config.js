// Simple test script to check if messageConfig is working
const messageConfig = require('./dist/config/messageConfig').default;

console.log('MESSAGE_PROVIDER:', messageConfig.get('MESSAGE_PROVIDER'));
console.log('MESSAGE_IGNORE_BOTS:', messageConfig.get('MESSAGE_IGNORE_BOTS'));
console.log('MESSAGE_WAKEWORDS:', messageConfig.get('MESSAGE_WAKEWORDS'));