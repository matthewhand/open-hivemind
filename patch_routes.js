const fs = require('fs');

function patchFile(filePath, importStr, replacements) {
  try {
    let code = fs.readFileSync(filePath, 'utf8');
    if (!code.includes('import { validateRequest }')) {
      code = code.replace(
        /import (.*?) from '(.*?)';\n/m,
        `import $1 from '$2';\n${importStr}\n`
      );
    }

    replacements.forEach(({ search, replace }) => {
      code = code.replace(search, replace);
    });

    fs.writeFileSync(filePath, code);
    console.log(`Patched ${filePath}`);
  } catch (err) {
    console.error(`Failed to patch ${filePath}: ${err}`);
  }
}

// src/server/routes/botConfig.ts
patchFile(
  'src/server/routes/botConfig.ts',
  "import { validateRequest } from '../../validation/validateRequest';\nimport { BotApplyUpdateSchema } from '../../validation/schemas/miscSchema';",
  [
    {
      search: "router.post(\n  '/:botId/apply-update',\n  requireRole('admin'),\n  async (req: AuditedRequest, res: Response) => {",
      replace: "router.post(\n  '/:botId/apply-update',\n  requireRole('admin'),\n  validateRequest(BotApplyUpdateSchema),\n  async (req: AuditedRequest, res: Response) => {"
    }
  ]
);

// src/server/routes/cache.ts
patchFile(
  'src/server/routes/cache.ts',
  "import { validateRequest } from '../../validation/validateRequest';\nimport { ClearCacheSchema } from '../../validation/schemas/miscSchema';",
  [
    {
      search: "router.post('/clear', async (req, res) => {",
      replace: "router.post('/clear', validateRequest(ClearCacheSchema), async (req, res) => {"
    }
  ]
);

// src/server/routes/marketplace.ts
patchFile(
  'src/server/routes/marketplace.ts',
  "import { validateRequest } from '../../validation/validateRequest';\nimport { MarketplacePluginNameParamSchema, EmptySchema } from '../../validation/schemas/miscSchema';",
  [
    {
      search: "router.post('/install', requireRole('admin'), async (req, res) => {",
      replace: "router.post('/install', requireRole('admin'), validateRequest(EmptySchema), async (req, res) => {"
    },
    {
      search: "router.post('/uninstall/:name', requireRole('admin'), async (req, res) => {",
      replace: "router.post('/uninstall/:name', requireRole('admin'), validateRequest(MarketplacePluginNameParamSchema), async (req, res) => {"
    },
    {
      search: "router.post('/update/:name', requireRole('admin'), async (req, res) => {",
      replace: "router.post('/update/:name', requireRole('admin'), validateRequest(MarketplacePluginNameParamSchema), async (req, res) => {"
    }
  ]
);

// src/server/routes/errors.ts
patchFile(
  'src/server/routes/errors.ts',
  "import { validateRequest } from '../../validation/validateRequest';\nimport { ErrorLogSchema } from '../../validation/schemas/miscSchema';",
  [
    {
      search: "router.post('/frontend', async (req: Request, res: Response) => {",
      replace: "router.post('/frontend', validateRequest(ErrorLogSchema), async (req: Request, res: Response) => {"
    }
  ]
);

// src/server/routes/ci.ts
patchFile(
  'src/server/routes/ci.ts',
  "import { validateRequest } from '../../validation/validateRequest';\nimport { CIDeploySchema, CIRollbackSchema, EmptySchema } from '../../validation/schemas/miscSchema';",
  [
    {
      search: "router.post('/api/deployments', (req, res) => {",
      replace: "router.post('/api/deployments', validateRequest(CIDeploySchema), (req, res) => {"
    },
    {
      search: "router.post('/api/deployments/:id/rollback', (req, res) => {",
      replace: "router.post('/api/deployments/:id/rollback', validateRequest(CIRollbackSchema), (req, res) => {"
    },
    {
      search: "router.post('/api/deployments/validate', (req, res) => {",
      replace: "router.post('/api/deployments/validate', validateRequest(EmptySchema), (req, res) => {"
    },
    {
      search: "router.post('/api/tests/run', (req, res) => {",
      replace: "router.post('/api/tests/run', validateRequest(EmptySchema), (req, res) => {"
    }
  ]
);

// src/server/routes/anomaly.ts
patchFile(
  'src/server/routes/anomaly.ts',
  "import { validateRequest } from '../../validation/validateRequest';\nimport { AnomalyResolveSchema } from '../../validation/schemas/miscSchema';",
  [
    {
      search: "router.post('/:id/resolve', async (req: AuthMiddlewareRequest, res) => {",
      replace: "router.post('/:id/resolve', validateRequest(AnomalyResolveSchema), async (req: AuthMiddlewareRequest, res) => {"
    }
  ]
);

// src/server/routes/webhookEvents.ts
patchFile(
  'src/server/routes/webhookEvents.ts',
  "import { validateRequest } from '../../validation/validateRequest';\nimport { WebhookRetrySchema } from '../../validation/schemas/miscSchema';",
  [
    {
      search: "router.post('/events/:id/retry', async (req, res) => {",
      replace: "router.post('/events/:id/retry', validateRequest(WebhookRetrySchema), async (req, res) => {"
    }
  ]
);

// src/server/routes/dashboard.ts
patchFile(
  'src/server/routes/dashboard.ts',
  "import { validateRequest } from '../../validation/validateRequest';\nimport { DashboardConfigSchema, DashboardFeedbackSchema, AlertIdParamSchema } from '../../validation/schemas/miscSchema';",
  [
    {
      search: "router.post('/ai/config', authenticate, requireAdmin, (req, res) => {",
      replace: "router.post('/ai/config', authenticate, requireAdmin, validateRequest(DashboardConfigSchema), (req, res) => {"
    },
    {
      search: "router.post('/ai/feedback', authenticate, requireAdmin, async (req, res) => {",
      replace: "router.post('/ai/feedback', authenticate, requireAdmin, validateRequest(DashboardFeedbackSchema), async (req, res) => {"
    },
    {
      search: "router.post('/alerts/:id/acknowledge', authenticate, requireAdmin, (req, res) => {",
      replace: "router.post('/alerts/:id/acknowledge', authenticate, requireAdmin, validateRequest(AlertIdParamSchema), (req, res) => {"
    },
    {
      search: "router.post('/alerts/:id/resolve', authenticate, requireAdmin, (req, res) => {",
      replace: "router.post('/alerts/:id/resolve', authenticate, requireAdmin, validateRequest(AlertIdParamSchema), (req, res) => {"
    }
  ]
);

// src/server/routes/ai-assist.ts
patchFile(
  'src/server/routes/ai-assist.ts',
  "import { validateRequest } from '../../validation/validateRequest';\nimport { ChatGenerateSchema } from '../../validation/schemas/miscSchema';",
  [
    {
      search: "router.post('/generate', async (req, res) => {",
      replace: "router.post('/generate', validateRequest(ChatGenerateSchema), async (req, res) => {"
    }
  ]
);

// src/server/routes/consolidated.ts
patchFile(
  'src/server/routes/consolidated.ts',
  "import { validateRequest } from '../../validation/validateRequest';\nimport { ValidateConfigSchema } from '../../validation/schemas/miscSchema';",
  [
    {
      search: "router.post('/validate-config', async (req, res) => {",
      replace: "router.post('/validate-config', validateRequest(ValidateConfigSchema), async (req, res) => {"
    }
  ]
);
