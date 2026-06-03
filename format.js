const fs = require('fs');

const daoPath = 'src/database/dao/BotConfigurationDAO.ts';
let daoCode = fs.readFileSync(daoPath, 'utf8');

// Replace table name interpolation
daoCode = daoCode.replace(/this\.tableName/g, "'bot_configurations'");
// Clean up the security comment changes that break compilation if incorrectly substituted
daoCode = daoCode.replace(/'SELECT COUNT\(\*\) as total FROM ' \+ 'bot_configurations'/, "'SELECT COUNT(*) as total FROM bot_configurations'");
daoCode = daoCode.replace(/'SELECT COUNT\(\*\) as active FROM ' \+ 'bot_configurations' \+ ' WHERE isActive = 1'/, "'SELECT COUNT(*) as active FROM bot_configurations WHERE isActive = 1'");

// Re-write the complex multi-line strings cleanly
const providerRowsRegex = /'SELECT messageProvider, COUNT\(\*\) as count FROM ' \+\s*'bot_configurations' \+\s*' GROUP BY messageProvider'/g;
daoCode = daoCode.replace(providerRowsRegex, "'SELECT messageProvider, COUNT(*) as count FROM bot_configurations GROUP BY messageProvider'");

const tenantRowsRegex = /'SELECT COALESCE\(tenantId, "default"\) as tenant, COUNT\(\*\) as count FROM ' \+\s*'bot_configurations' \+\s*' GROUP BY tenantId'/g;
daoCode = daoCode.replace(tenantRowsRegex, "'SELECT COALESCE(tenantId, \"default\") as tenant, COUNT(*) as count FROM bot_configurations GROUP BY tenantId'");

// Remove the private tableName property declaration
daoCode = daoCode.replace(/\s*private readonly tableName = 'bot_configurations';\n/g, "");

fs.writeFileSync(daoPath, daoCode);
