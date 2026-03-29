import { execSync } from 'child_process';
execSync('pnpm exec prettier --write src/server/routes/mcp.ts');
