const sqliteMock = require('./sqlite');
// Handle both ESM and CommonJS
const Database = sqliteMock.default || sqliteMock;
module.exports = Database;
// Attach other exports for compatibility
Object.assign(module.exports, sqliteMock.default || sqliteMock);
