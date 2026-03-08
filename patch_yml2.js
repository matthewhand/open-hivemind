const fs = require('fs');
const glob = require('glob');

const files = glob.sync('.github/workflows/*.yml');

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');

  // Replace Setup Node.js cache: npm to pnpm
  content = content.replace(/cache: 'npm'/g, "cache: 'pnpm'");
  content = content.replace(/cache: npm/g, "cache: 'pnpm'");

  // ensure the setup node cache is pnpm

  fs.writeFileSync(file, content);
}
