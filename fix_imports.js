const fs = require('fs');
const path = require('path');

const targetDir = 'src/server/routes/health';
const files = ['basic.ts', 'detailed.ts', 'metrics.ts', 'diagnostics.ts', 'helpers.ts'];

for (const file of files) {
  const filePath = path.join(targetDir, file);
  if (!fs.existsSync(filePath)) continue;
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace default imports for os and process with namespace imports or requires
  content = content.replace(/import os from 'os';/g, "import * as os from 'os';");
  content = content.replace(/import process from 'process';/g, "import * as process from 'process';");

  // Also correct the imports for paths
  // Currently they are like '../../../../../../../../monitoring/MetricsCollector'
  // Let's replace them with correct relative paths if they point to src/
  // The structure is src/server/routes/health/basic.ts
  // So 'src/monitoring' is `../../../monitoring`

  // Replace deep nested imports with correct ones
  content = content.replace(/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\//g, "../../../");
  content = content.replace(/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\//g, "../../../");
  content = content.replace(/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\//g, "../../../");
  content = content.replace(/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\//g, "../../../");
  content = content.replace(/\.\.\/\.\.\/\.\.\/\.\.\//g, "../../../");
  content = content.replace(/import \{ optionalAuth \} from '\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/middleware/g, "import { optionalAuth } from '../../middleware");
  content = content.replace(/import \{ optionalAuth \} from '\.\.\/\.\.\/\.\.\/\.\.\/middleware/g, "import { optionalAuth } from '../../middleware");
  content = content.replace(/import \{ optionalAuth \} from '\.\.\/\.\.\/\.\.\/middleware/g, "import { optionalAuth } from '../../middleware");
  content = content.replace(/import \{ optionalAuth \} from '\.\.\/\.\.\/middleware/g, "import { optionalAuth } from '../../middleware");
  content = content.replace(/import \{ optionalAuth \} from '\.\.\/middleware/g, "import { optionalAuth } from '../../middleware");
  content = content.replace(/import \{ optionalAuth \} from '\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/middleware\/auth';/g, "import { optionalAuth } from '../../middleware/auth';");

  content = content.replace(/require\('\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\//g, "require('../../../");
  content = content.replace(/require\('\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\//g, "require('../../../");
  content = content.replace(/require\('\.\.\/\.\.\/\.\.\/\.\.\/\.\.\//g, "require('../../../");
  content = content.replace(/require\('\.\.\/\.\.\/\.\.\/\.\.\//g, "require('../../../");

  fs.writeFileSync(filePath, content);
}
