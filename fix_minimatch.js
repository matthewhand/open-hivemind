const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
if (pkg.pnpm && pkg.pnpm.overrides && pkg.pnpm.overrides['//minimatch']) {
  delete pkg.pnpm.overrides['//minimatch'];
  fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
}
