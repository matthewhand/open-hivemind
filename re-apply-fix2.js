const fs = require('fs');
const path = require('path');

function replaceFileContent(filePath, replacer) {
  const fullPath = path.join(__dirname, filePath);
  if (!fs.existsSync(fullPath)) {
    console.error(`File not found: ${fullPath}`);
    return;
  }
  let content = fs.readFileSync(fullPath, 'utf-8');
  content = replacer(content);
  fs.writeFileSync(fullPath, content, 'utf-8');
  console.log(`Updated ${filePath}`);
}

// 1. dashboard.ts
replaceFileContent('src/server/routes/dashboard.ts', (c) => {
  let res = c;
  if (!res.includes(`import { createLogger } from '@src/common/StructuredLogger';`)) {
    res = res.replace(
      `import { ActivityLogger } from '../services/ActivityLogger';`,
      `import { ActivityLogger } from '../services/ActivityLogger';\nimport { createLogger } from '@src/common/StructuredLogger';`
    );
    res = res.replace(
      `const router = Router();`,
      `const router = Router();\nconst logger = createLogger('routes:dashboard');`
    );
  }
  res = res.replace(/console\.error\('Error storing AI feedback:', error\);/g, `logger.error('Error storing AI feedback:', error instanceof Error ? error : new Error(String(error)));`);
  res = res.replace(/console\.warn\('Failed to load bots for status:', e\);/g, `logger.warn('Failed to load bots for status', { error: e instanceof Error ? e.message : String(e) });`);
  res = res.replace(/console\.error\('Status API error:', error\);/g, `logger.error('Status API error:', error instanceof Error ? error : new Error(String(error)));`);
  res = res.replace(/console\.error\('Activity API error:', error\);/g, `logger.error('Activity API error:', error instanceof Error ? error : new Error(String(error)));`);
  res = res.replace(/console\.error\('Acknowledge alert error:', error\);/g, `logger.error('Acknowledge alert error:', error instanceof Error ? error : new Error(String(error)));`);
  res = res.replace(/console\.error\('Resolve alert error:', error\);/g, `logger.error('Resolve alert error:', error instanceof Error ? error : new Error(String(error)));`);
  return res;
});

// 2. sitemap.ts
replaceFileContent('src/server/routes/sitemap.ts', (c) => {
  let res = c;
  if (!res.includes(`import { createLogger } from '@src/common/StructuredLogger';`)) {
    res = res.replace(
      `import { SitemapStream, streamToPromise } from 'sitemap';`,
      `import { SitemapStream, streamToPromise } from 'sitemap';\nimport { createLogger } from '@src/common/StructuredLogger';`
    );
    res = res.replace(
      `const router = Router();`,
      `const router = Router();\nconst logger = createLogger('routes:sitemap');`
    );
  }
  res = res.replace(/console\.error\('Error generating sitemap:', error\);/g, `logger.error('Error generating sitemap:', error instanceof Error ? error : new Error(String(error)));`);
  res = res.replace(/console\.error\('Error generating JSON sitemap:', error\);/g, `logger.error('Error generating JSON sitemap:', error instanceof Error ? error : new Error(String(error)));`);
  res = res.replace(/console\.error\('Error generating HTML sitemap:', error\);/g, `logger.error('Error generating HTML sitemap:', error instanceof Error ? error : new Error(String(error)));`);
  return res;
});

// 3. cache.ts
replaceFileContent('src/server/routes/cache.ts', (c) => {
  let res = c;
  if (!res.includes(`import { createLogger } from '@src/common/StructuredLogger';`)) {
    res = res.replace(
      `import { clearAllSystemCaches } from '../utils/cacheManager'; // We'll implement this`,
      `import { clearAllSystemCaches } from '../utils/cacheManager'; // We'll implement this\nimport { createLogger } from '@src/common/StructuredLogger';`
    );
    res = res.replace(
      `const router = Router();`,
      `const router = Router();\nconst logger = createLogger('routes:cache');`
    );
  }
  res = res.replace(/console\.error\('Failed to clear cache:', error\);/g, `logger.error('Failed to clear cache:', error instanceof Error ? error : new Error(String(error)));`);
  return res;
});

// 4. letta.ts
replaceFileContent('src/server/routes/letta.ts', (c) => {
  let res = c;
  if (!res.includes(`import { createLogger } from '@src/common/StructuredLogger';`)) {
    res = res.replace(
      `import { getAgent, listAgents } from '@hivemind/llm-letta';`,
      `import { getAgent, listAgents } from '@hivemind/llm-letta';\nimport { createLogger } from '@src/common/StructuredLogger';`
    );
    res = res.replace(
      `const router = Router();`,
      `const router = Router();\nconst logger = createLogger('routes:letta');`
    );
  }
  res = res.replace(/console\.error\('Letta agents lookup error:', error\);/g, `logger.error('Letta agents lookup error:', error instanceof Error ? error : new Error(String(error)));`);
  res = res.replace(/console\.error\('Letta agent details error:', error\);/g, `logger.error('Letta agent details error:', error instanceof Error ? error : new Error(String(error)));`);
  return res;
});

// 5. guards.ts
replaceFileContent('src/server/routes/guards.ts', (c) => {
  let res = c;
  if (!res.includes(`import { createLogger } from '@src/common/StructuredLogger';`)) {
    res = res.replace(
      `import { webUIStorage } from '../../storage/webUIStorage';`,
      `import { webUIStorage } from '../../storage/webUIStorage';\nimport { createLogger } from '@src/common/StructuredLogger';`
    );
    res = res.replace(
      `const debug = Debug('app:webui:guards');`,
      `const debug = Debug('app:webui:guards');\nconst logger = createLogger('routes:guards');`
    );
  }
  res = res.replace(/console\.error\('Error retrieving guards:', error\);/g, `logger.error('Error retrieving guards:', error instanceof Error ? error : new Error(String(error)));`);
  return res;
});

// 6. validation.ts
replaceFileContent('src/server/routes/validation.ts', (c) => {
  let res = c;
  if (!res.includes(`import { createLogger } from '@src/common/StructuredLogger';`)) {
    res = res.replace(
      `import { RealTimeValidationService } from '../services/RealTimeValidationService';`,
      `import { RealTimeValidationService } from '../services/RealTimeValidationService';\nimport { createLogger } from '@src/common/StructuredLogger';`
    );
    res = res.replace(
      `const validationService = RealTimeValidationService.getInstance();`,
      `const validationService = RealTimeValidationService.getInstance();\nconst logger = createLogger('routes:validation');`
    );
  }
  res = res.replace(/console\.error\('Validation error:', hivemindError\);/g, `logger.error('Validation error:', hivemindError instanceof Error ? hivemindError : new Error(String(hivemindError)));`);
  res = res.replace(/console\.error\('Error in Configuration validation endpoint:', error\);/g, `logger.error('Error in Configuration validation endpoint:', error instanceof Error ? error : new Error(String(error)));`);
  res = res.replace(/console\.error\('Error in', 'Validation schema endpoint'\);/g, `logger.error('Error in Validation schema endpoint', error instanceof Error ? error : new Error(String(error)));`);
  res = res.replace(/console\.error\('Error in', 'Get validation rules endpoint'\);/g, `logger.error('Error in Get validation rules endpoint', error instanceof Error ? error : new Error(String(error)));`);
  res = res.replace(/console\.error\('Error in', 'Get validation rule endpoint'\);/g, `logger.error('Error in Get validation rule endpoint', error instanceof Error ? error : new Error(String(error)));`);
  res = res.replace(/console\.error\('Error in', 'Create validation rule endpoint'\);/g, `logger.error('Error in Create validation rule endpoint', error instanceof Error ? error : new Error(String(error)));`);
  res = res.replace(/console\.error\('Error in', 'Delete validation rule endpoint'\);/g, `logger.error('Error in Delete validation rule endpoint', error instanceof Error ? error : new Error(String(error)));`);
  res = res.replace(/console\.error\('Error in', 'Get validation profiles endpoint'\);/g, `logger.error('Error in Get validation profiles endpoint', error instanceof Error ? error : new Error(String(error)));`);
  res = res.replace(/console\.error\('Error in', 'Get validation profile endpoint'\);/g, `logger.error('Error in Get validation profile endpoint', error instanceof Error ? error : new Error(String(error)));`);
  res = res.replace(/console\.error\('Error in', 'Create validation profile endpoint'\);/g, `logger.error('Error in Create validation profile endpoint', error instanceof Error ? error : new Error(String(error)));`);
  res = res.replace(/console\.error\('Error in', 'Delete validation profile endpoint'\);/g, `logger.error('Error in Delete validation profile endpoint', error instanceof Error ? error : new Error(String(error)));`);
  res = res.replace(/console\.error\('Error validating configuration:', error\);/g, `logger.error('Error validating configuration:', error instanceof Error ? error : new Error(String(error)));`);
  res = res.replace(/console\.error\('Error in', 'Validate configuration data endpoint'\);/g, `logger.error('Error in Validate configuration data endpoint', error instanceof Error ? error : new Error(String(error)));`);
  res = res.replace(/console\.error\('Error in', 'Subscribe to validation endpoint'\);/g, `logger.error('Error in Subscribe to validation endpoint', error instanceof Error ? error : new Error(String(error)));`);
  res = res.replace(/console\.error\('Error in', 'Unsubscribe from validation endpoint'\);/g, `logger.error('Error in Unsubscribe from validation endpoint', error instanceof Error ? error : new Error(String(error)));`);
  res = res.replace(/console\.error\('Error in', 'Get validation history endpoint'\);/g, `logger.error('Error in Get validation history endpoint', error instanceof Error ? error : new Error(String(error)));`);
  res = res.replace(/console\.error\('Error in', 'Get validation statistics endpoint'\);/g, `logger.error('Error in Get validation statistics endpoint', error instanceof Error ? error : new Error(String(error)));`);
  return res;
});

// 7. errors.ts
replaceFileContent('src/server/routes/errors.ts', (c) => {
  let res = c;
  if (!res.includes(`import { createLogger } from '@src/common/StructuredLogger';`)) {
    res = res.replace(
      `import { authenticateToken } from '../middleware/auth';`,
      `import { authenticateToken } from '../middleware/auth';\nimport { createLogger } from '@src/common/StructuredLogger';`
    );
    res = res.replace(
      `const router = Router();`,
      `const router = Router();\nconst logger = createLogger('routes:errors');`
    );
  }
  res = res.replace(/console\.error\('Failed to process frontend error report:', error\);/g, `logger.error('Failed to process frontend error report:', error instanceof Error ? error : new Error(String(error)));`);
  res = res.replace(/console\.error\('Failed to get error stats:', error\);/g, `logger.error('Failed to get error stats:', error instanceof Error ? error : new Error(String(error)));`);
  res = res.replace(/console\.error\('Failed to get recent errors:', error\);/g, `logger.error('Failed to get recent errors:', error instanceof Error ? error : new Error(String(error)));`);
  return res;
});

// 8. importExport.ts
replaceFileContent('src/server/routes/importExport.ts', (c) => {
  let res = c;
  if (!res.includes(`import { createLogger } from '@src/common/StructuredLogger';`)) {
    res = res.replace(
      `const multer = require('multer');`,
      `const multer = require('multer');\nimport { createLogger } from '@src/common/StructuredLogger';`
    );
    res = res.replace(
      `const importExportService = ConfigurationImportExportService.getInstance();`,
      `const importExportService = ConfigurationImportExportService.getInstance();\nconst logger = createLogger('routes:importExport');`
    );
  }
  res = res.replace(/console\.error\('Error exporting configurations:', error\);/g, `logger.error('Error exporting configurations:', error instanceof Error ? error : new Error(String(error)));`);
  res = res.replace(/console\.error\('Error cleaning up uploaded file:', cleanupError\);/g, `logger.error('Error cleaning up uploaded file:', cleanupError instanceof Error ? cleanupError : new Error(String(cleanupError)));`);
  res = res.replace(/console\.error\('Error importing configurations:', error\);/g, `logger.error('Error importing configurations:', error instanceof Error ? error : new Error(String(error)));`);
  res = res.replace(/console\.error\('Error creating backup:', error\);/g, `logger.error('Error creating backup:', error instanceof Error ? error : new Error(String(error)));`);
  res = res.replace(/console\.error\('Error listing backups:', error\);/g, `logger.error('Error listing backups:', error instanceof Error ? error : new Error(String(error)));`);
  res = res.replace(/console\.error\('Error restoring from backup:', error\);/g, `logger.error('Error restoring from backup:', error instanceof Error ? error : new Error(String(error)));`);
  res = res.replace(/console\.error\('Error deleting backup:', error\);/g, `logger.error('Error deleting backup:', error instanceof Error ? error : new Error(String(error)));`);
  res = res.replace(/console\.error\('Error downloading backup:', error\);/g, `logger.error('Error downloading backup:', error instanceof Error ? error : new Error(String(error)));`);
  res = res.replace(/console\.error\('Error validating file:', error\);/g, `logger.error('Error validating file:', error instanceof Error ? error : new Error(String(error)));`);
  return res;
});

// 9. config.ts
replaceFileContent('src/server/routes/config.ts', (c) => {
  let res = c;
  if (!res.includes(`import { createLogger } from '@src/common/StructuredLogger';`)) {
    res = res.replace(
      `}

const debug = Debug('app:server:routes:config');`,
      `}

import { createLogger } from '@src/common/StructuredLogger';

const debug = Debug('app:server:routes:config');`
    );
    res = res.replace(
      `const router = Router();`,
      `const router = Router();\nconst logger = createLogger('routes:config');`
    );
  }
  res = res.replace(/console\.error\('Failed to load dynamic configs:', e\);/g, `logger.error('Failed to load dynamic configs:', e instanceof Error ? e : new Error(String(e)));`);
  return res;
});

// 10. specs.ts
replaceFileContent('src/server/routes/specs.ts', (c) => {
  let res = c;
  if (!res.includes(`import { createLogger } from '@src/common/StructuredLogger';`)) {
    res = res.replace(
      `import { z } from 'zod';`,
      `import { z } from 'zod';\nimport { createLogger } from '@src/common/StructuredLogger';`
    );
    res = res.replace(
      `const router = Router();`,
      `const router = Router();\nconst logger = createLogger('routes:specs');`
    );
  }
  res = res.replace(/console\.error\('Failed to save spec:', error\);/g, `logger.error('Failed to save spec:', error instanceof Error ? error : new Error(String(error)));`);
  return res;
});
