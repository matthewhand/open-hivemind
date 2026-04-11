const fs = require('fs');

const path = 'src/auth/middleware.ts';
let content = fs.readFileSync(path, 'utf-8');

// Fix missing return types on requireRole and requirePermission
content = content.replace(
  /public requireRole = \(requiredRole: string\) => {/,
  'public requireRole = (requiredRole: string): ((req: Request, res: Response, next: NextFunction) => void) => {'
);

content = content.replace(
  /public requirePermission = \(permission: string\) => {/,
  'public requirePermission = (permission: string): ((req: Request, res: Response, next: NextFunction) => void) => {'
);

fs.writeFileSync(path, content, 'utf-8');
