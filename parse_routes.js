const fs = require('fs');

const content = fs.readFileSync('src/server/routes/health.ts', 'utf8');

const imports = content.substring(0, content.indexOf('const router = Router();')).trim();

const basicRoutes = [];
const detailedRoutes = [];
const metricsRoutes = [];
const diagnosticsRoutes = [];

// Manually extract based on lines
const lines = content.split('\n');

function getBlock(startLine, endLine) {
    return lines.slice(startLine - 1, endLine).join('\n');
}

// basic.ts: /, /ready, /live
basicRoutes.push(getBlock(19, 87));   // /
basicRoutes.push(getBlock(381, 406)); // /ready
basicRoutes.push(getBlock(407, 415)); // /live

// detailed.ts: /detailed, /detailed/services
detailedRoutes.push(getBlock(88, 171));  // /detailed
detailedRoutes.push(getBlock(172, 312)); // /detailed/services

// metrics.ts: /metrics, /metrics/prometheus, /alerts
metricsRoutes.push(getBlock(313, 343)); // /metrics
metricsRoutes.push(getBlock(344, 380)); // /alerts
metricsRoutes.push(getBlock(416, 500)); // /metrics/prometheus

// diagnostics.ts: /api-endpoints, /cleanup, /errors, /recovery, /errors/patterns
diagnosticsRoutes.push(getBlock(501, 717)); // api-endpoints, cleanup, and error handling middleware
diagnosticsRoutes.push(getBlock(718, 746)); // /errors
diagnosticsRoutes.push(getBlock(747, 773)); // /recovery
diagnosticsRoutes.push(getBlock(774, 814)); // /errors/patterns

// Helpers block
const helpers = getBlock(815, 1047);

// The helpers are used in different files. We should create a helpers file or duplicate them,
// but since the original is one file, we should probably extract them to `src/server/routes/health/helpers.ts`
// Let's create `src/server/routes/health/helpers.ts` and import from it, OR just put them in a shared file.

// It's probably better to create `src/server/routes/health/helpers.ts`
const helpersImports = `import { HEALTH_THRESHOLDS } from '../../../types/constants';`;
const helpersCode = helpersImports + '\n\n' + helpers.replace(/function/g, 'export function');

fs.writeFileSync('src/server/routes/health/helpers.ts', helpersCode);

function writeRouter(name, blocks, extraImports = '') {
    let fileContent = imports + '\n' + extraImports + '\nconst router = Router();\n\n' + blocks.join('\n\n') + '\n\nexport default router;\n';
    // adjust relative imports inside the new files since they are one level deeper
    fileContent = fileContent.replace(/\.\.\//g, '../../../');
    // But wait, the original was `../../`, so going one deeper means `../../../`
    // Let's write a smarter replace for relative paths
    fileContent = fileContent.replace(/from '\.\.\/\.\.\//g, "from '../../../");
    fileContent = fileContent.replace(/from '\.\.\//g, "from '../../");
    fileContent = fileContent.replace(/require\('\.\.\/\.\.\//g, "require('../../../");

    fs.writeFileSync(`src/server/routes/health/${name}.ts`, fileContent);
}

writeRouter('basic', basicRoutes);
writeRouter('detailed', detailedRoutes, `import { calculateHealthStatus, calculateErrorRate } from './helpers';`);
writeRouter('metrics', metricsRoutes);
writeRouter('diagnostics', diagnosticsRoutes, `import { calculateErrorRate, getErrorHealthStatus, getErrorRecommendations, getRecoveryHealthStatus, getRecoveryRecommendations, detectErrorSpikes, detectErrorCorrelations, detectErrorAnomalies, generatePatternRecommendations } from './helpers';`);

console.log("Files generated");
