#!/usr/bin/env node

/**
 * Script to add usage tracking import to MCPToolsPage.tsx
 * This addresses the issue where the file keeps getting modified by auto-formatters
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/client/src/pages/MCPToolsPage.tsx');

// Read the file
let content = fs.readFileSync(filePath, 'utf8');

// Check if the import already exists
if (content.includes("import usageTrackingService from '../services/usageTrackingService'")) {
  console.log('✓ Import already exists');
  process.exit(0);
}

// Find the line with useUrlParams import
const useUrlParamsImportRegex = /import useUrlParams from '\.\.\/hooks\/useUrlParams';/;

if (!useUrlParamsImportRegex.test(content)) {
  console.error('✗ Could not find useUrlParams import line');
  process.exit(1);
}

// Add the new import after useUrlParams
content = content.replace(
  useUrlParamsImportRegex,
  `import useUrlParams from '../hooks/useUrlParams';
import usageTrackingService from '../services/usageTrackingService';`
);

// Write the file back
fs.writeFileSync(filePath, content, 'utf8');

console.log('✓ Successfully added usage tracking import to MCPToolsPage.tsx');
console.log('  Next steps:');
console.log('  1. Add the useEffect hook to load usage metrics (see USAGE_TRACKING_INTEGRATION.md)');
console.log('  2. Run the application and test tool execution');
console.log('  3. Verify metrics are persisted in data/tool-usage-metrics.json');
