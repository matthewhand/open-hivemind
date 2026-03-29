const fs = require('fs');

function replaceFile(path) {
  let content = fs.readFileSync(path, 'utf8');

  // Replace hivemindError.message -> ErrorUtils.getMessage(hivemindError)
  content = content.replace(/hivemindError\.message/g, 'ErrorUtils.getMessage(hivemindError)');

  // Replace hivemindError.code -> ErrorUtils.getCode(hivemindError)
  content = content.replace(/hivemindError\.code/g, 'ErrorUtils.getCode(hivemindError)');

  // Replace hivemindError.statusCode -> ErrorUtils.getStatusCode(hivemindError)
  content = content.replace(/hivemindError\.statusCode/g, 'ErrorUtils.getStatusCode(hivemindError)');

  fs.writeFileSync(path, content, 'utf8');
}

replaceFile('src/server/routes/mcp.ts');
replaceFile('src/config/SecureConfigManager.ts');

console.log('Fixed error usages.');
