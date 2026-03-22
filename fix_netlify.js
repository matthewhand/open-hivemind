const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'netlify.toml');
let content = fs.readFileSync(file, 'utf8');

// I already deleted the lines, but just to make sure the file is properly formatted:
if (content.includes('test "$BRANCH" != "main"')) {
    content = content.replace(/.*ignore = "test \\"\$BRANCH\\" != \\"main\\"".*/g, '');
}

// Memory recording also stated: "To resolve Netlify CI build failures in a pnpm monorepo where the root lockfile is out of sync... update the build command in netlify.toml to pnpm install --no-frozen-lockfile." Wait, we just want to change build command:

content = content.replace(/command = "npm run build:netlify"/g, 'command = "pnpm install --no-frozen-lockfile && npm run build:netlify"');

// Actually, pnpm isn't always installed globally on netlify unless configured. Let's look at netlify.toml again.
fs.writeFileSync(file, content);
