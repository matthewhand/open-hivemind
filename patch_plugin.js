const fs = require('fs');
const file = 'src/plugins/PluginManager.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
`  // Prevent shell metacharacters in hostname
  if (/[;&|\`$()]/.test(parsedUrl.hostname)) {
    throw new PluginValidationError("Invalid repository URL: contains shell metacharacters.");
  }
 * Install a community plugin from a git repository URL.`,
`  // Prevent shell metacharacters in hostname
  if (/[;&|\`$()]/.test(parsedUrl.hostname)) {
    throw new PluginValidationError("Invalid repository URL: contains shell metacharacters.");
  }
}

/**
 * Install a community plugin from a git repository URL.`
);

fs.writeFileSync(file, content);
