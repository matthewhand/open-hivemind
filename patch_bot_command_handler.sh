const fs = require('fs');

const path = 'src/cli/handlers/BotCommandHandler.ts';
let content = fs.readFileSync(path, 'utf-8');

// Replace any with correct type or unknown
content = content.replace(/addBot\(options: any\)/g, 'addBot(options: Record<string, unknown>)');
content = content.replace(/\(bot as any\)/g, '(bot as Record<string, unknown>)');

// Add eslint-disable-next-line no-console
content = content.replace(/console\.error\(chalk\.red/g, '// eslint-disable-next-line no-console\n      console.error(chalk.red');
content = content.replace(/console\.log\(chalk\.yellow/g, '// eslint-disable-next-line no-console\n      console.log(chalk.yellow');
content = content.replace(/console\.log\(chalk\.blue/g, '// eslint-disable-next-line no-console\n      console.log(chalk.blue');
content = content.replace(/console\.log\(/g, '// eslint-disable-next-line no-console\n      console.log(');

// Due to multiple replacements in the same line we should be more targeted. I'll just use sed manually
