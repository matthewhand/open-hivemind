const messageConfig = require('./dist/config/messageConfig');
console.log('MESSAGE_PROVIDER:', messageConfig.default.get('MESSAGE_PROVIDER'));
console.log('All config:', messageConfig.default.get());