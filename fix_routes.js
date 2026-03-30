const fs = require('fs');
const path = require('path');

const targetDir = 'src/server/routes/health';
const originalFile = 'src/server/routes/health.ts.backup';
const content = fs.readFileSync(originalFile, 'utf8');
const lines = content.split('\n');

function extractLines(start, end) {
  return lines.slice(start - 1, end).join('\n');
}

// FIX helpers
const helpersLines = extractLines(813, 1047);
const helpersExported = helpersLines.replace(/^function /gm, 'export function ');
const helpersContent = `
import { HEALTH_THRESHOLDS } from '../../types/constants';

${helpersExported}
`.trim() + '\n';
fs.writeFileSync(path.join(targetDir, 'helpers.ts'), helpersContent);

// FIX diagnostics
const diagnosticsText = fs.readFileSync(path.join(targetDir, 'diagnostics.ts'), 'utf8');
const fixedDiagnostics = diagnosticsText.replace(/\/\/ Helper functions for health calculations\nfunction calculateHealthStatus\(\n  memoryUsage: NodeJS.MemoryUsage,\n/g, '');
fs.writeFileSync(path.join(targetDir, 'diagnostics.ts'), fixedDiagnostics);
