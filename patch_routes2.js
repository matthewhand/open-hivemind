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

// src/server/routes/importExport.ts
patchFile(
  'src/server/routes/importExport.ts',
  "import { validateRequest } from '../../validation/validateRequest';\nimport { ImportConfigSchema, ExportConfigSchema } from '../../validation/schemas/miscSchema';",
  [
    {
      search: "router.post(\n  '/import',\n  requireAdmin,\n  upload.single('file'),",
      replace: "router.post(\n  '/import',\n  requireAdmin,\n  upload.single('file'),\n  validateRequest(ImportConfigSchema),"
    },
    {
      search: "router.post(\n  '/import/personas',\n  requireAdmin,\n  upload.single('file'),",
      replace: "router.post(\n  '/import/personas',\n  requireAdmin,\n  upload.single('file'),\n  validateRequest(ImportConfigSchema),"
    },
    {
      search: "router.post(\n  '/import/llm-profiles',\n  requireAdmin,\n  upload.single('file'),",
      replace: "router.post(\n  '/import/llm-profiles',\n  requireAdmin,\n  upload.single('file'),\n  validateRequest(ImportConfigSchema),"
    },
    {
      search: "router.post(\n  '/export',\n  requireAdmin,\n  async (req: AuditedRequest, res: Response) => {",
      replace: "router.post(\n  '/export',\n  requireAdmin,\n  validateRequest(ExportConfigSchema),\n  async (req: AuditedRequest, res: Response) => {"
    },
    {
      search: "router.post(\n  '/export/personas',\n  requireAdmin,\n  async (req: AuditedRequest, res: Response) => {",
      replace: "router.post(\n  '/export/personas',\n  requireAdmin,\n  validateRequest(ExportConfigSchema),\n  async (req: AuditedRequest, res: Response) => {"
    }
  ]
);

// src/server/routes/specs.ts
patchFile(
  'src/server/routes/specs.ts',
  "import { validateRequest } from '../../validation/validateRequest';\nimport { SpecSchema } from '../../validation/schemas/miscSchema';",
  [
    {
      search: "router.post('/', async (req, res) => {",
      replace: "router.post('/', validateRequest(SpecSchema), async (req, res) => {"
    }
  ]
);

// src/server/routes/demo.ts
patchFile(
  'src/server/routes/demo.ts',
  "import { validateRequest } from '../../validation/validateRequest';\nimport { ChatGenerateSchema, EmptySchema } from '../../validation/schemas/miscSchema';",
  [
    {
      search: "router.post('/chat', (req, res) => {",
      replace: "router.post('/chat', validateRequest(ChatGenerateSchema), (req, res) => {"
    },
    {
      search: "router.post('/reset', (req, res) => {",
      replace: "router.post('/reset', validateRequest(EmptySchema), (req, res) => {"
    }
  ]
);

// src/server/routes/validation.ts
patchFile(
  'src/server/routes/validation.ts',
  "import { validateRequest } from '../../validation/validateRequest';\nimport { ValidationTestSchema } from '../../validation/schemas/miscSchema';",
  [
    {
      search: "router.post('/api/validation/test', async (req: AuthMiddlewareRequest, res: Response) => {",
      replace: "router.post('/api/validation/test', validateRequest(ValidationTestSchema), async (req: AuthMiddlewareRequest, res: Response) => {"
    },
    {
      search: "router.post(\n  '/api/validation/real-time',\n  async (req: AuthMiddlewareRequest, res: Response) => {",
      replace: "router.post(\n  '/api/validation/real-time',\n  validateRequest(ValidationTestSchema),\n  async (req: AuthMiddlewareRequest, res: Response) => {"
    },
    {
      search: "router.post(\n  '/api/validation/fix',\n  async (req: AuthMiddlewareRequest, res: Response) => {",
      replace: "router.post(\n  '/api/validation/fix',\n  validateRequest(ValidationTestSchema),\n  async (req: AuthMiddlewareRequest, res: Response) => {"
    },
    {
      search: "router.post(\n  '/api/validation/fix-all',\n  async (req: AuthMiddlewareRequest, res: Response) => {",
      replace: "router.post(\n  '/api/validation/fix-all',\n  validateRequest(ValidationTestSchema),\n  async (req: AuthMiddlewareRequest, res: Response) => {"
    },
    {
      search: "router.post(\n  '/api/validation/ignore',\n  async (req: AuthMiddlewareRequest, res: Response) => {",
      replace: "router.post(\n  '/api/validation/ignore',\n  validateRequest(ValidationTestSchema),\n  async (req: AuthMiddlewareRequest, res: Response) => {"
    },
    {
      search: "router.post(\n  '/api/validation/history',\n  async (req: AuthMiddlewareRequest, res: Response) => {",
      replace: "router.post(\n  '/api/validation/history',\n  validateRequest(ValidationTestSchema),\n  async (req: AuthMiddlewareRequest, res: Response) => {"
    }
  ]
);
