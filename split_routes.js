const fs = require('fs');
const path = require('path');

const originalFile = 'src/server/routes/health.ts.backup';
const targetDir = 'src/server/routes/health';
const content = fs.readFileSync(originalFile, 'utf8');
const lines = content.split('\n');

function extractLines(start, end) {
  return lines.slice(start - 1, end).join('\n');
}

// Extract the top-level imports
const topImports = extractLines(1, 15);

// Update relative imports since we're one level deeper
const updatedImports = topImports
  .replace(/from '\.\.\//g, "from '../../")
  .replace(/from '\.\/middleware/g, "from '../middleware");

const helpersLines = extractLines(815, 1047);

// Fix "function " -> "export function "
const helpersExported = helpersLines.replace(/^function /gm, 'export function ');
const helpersContent = `
import { HEALTH_THRESHOLDS } from '../../types/constants';

${helpersExported}
`.trim();

fs.writeFileSync(path.join(targetDir, 'helpers.ts'), helpersContent);

function writeFile(name, routeExtracts, customImports = '') {
  let fileBody = updatedImports + '\n';
  if (customImports) {
    fileBody += customImports + '\n';
  }
  fileBody += '\nconst router = Router();\n\n';

  for (const block of routeExtracts) {
    fileBody += block + '\n\n';
  }

  fileBody += 'export default router;\n';

  // also fix up any inline require('../../database/DatabaseManager') -> require('../../../database/DatabaseManager')
  fileBody = fileBody.replace(/require\('\.\.\//g, "require('../../");

  fs.writeFileSync(path.join(targetDir, name + '.ts'), fileBody);
}

// basic.ts
const basicRoutes = [
  extractLines(19, 87),    // /
  extractLines(381, 406),  // /ready
  extractLines(407, 415),  // /live
];
writeFile('basic', basicRoutes);

// detailed.ts
const detailedRoutes = [
  extractLines(88, 171),   // /detailed
  extractLines(172, 312),  // /detailed/services
];
writeFile('detailed', detailedRoutes, "import { calculateHealthStatus, calculateErrorRate } from './helpers';");

// metrics.ts
const metricsRoutes = [
  extractLines(313, 343),  // /metrics
  extractLines(344, 380),  // /alerts
  extractLines(416, 500),  // /metrics/prometheus
];
writeFile('metrics', metricsRoutes);

// diagnostics.ts
const diagnosticsRoutes = [
  extractLines(501, 717),  // /api-endpoints, /cleanup, router.use
  extractLines(718, 746),  // /errors
  extractLines(747, 773),  // /recovery
  extractLines(774, 814),  // /errors/patterns
];
const diagImports = "import { calculateErrorRate, getErrorHealthStatus, getErrorRecommendations, getRecoveryHealthStatus, getRecoveryRecommendations, detectErrorSpikes, detectErrorCorrelations, detectErrorAnomalies, generatePatternRecommendations } from './helpers';";
writeFile('diagnostics', diagnosticsRoutes, diagImports);

// index.ts
const indexContent = `
import { Router } from 'express';
import basicRouter from './basic';
import detailedRouter from './detailed';
import metricsRouter from './metrics';
import diagnosticsRouter from './diagnostics';

const router = Router();

// Mount sub-routers
router.use('/', basicRouter);
router.use('/', detailedRouter);
router.use('/', metricsRouter);
router.use('/', diagnosticsRouter);

export default router;
`.trim() + '\n';

fs.writeFileSync(path.join(targetDir, 'index.ts'), indexContent);

console.log("Done refactoring health routes.");
