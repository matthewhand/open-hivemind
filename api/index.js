const serverless = require('serverless-http');
const app = require('../dist/src/index.js').default;

module.exports = serverless(app);