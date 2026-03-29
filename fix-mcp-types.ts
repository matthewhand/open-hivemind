import * as fs from 'fs';
let content = fs.readFileSync('src/server/routes/mcp.ts', 'utf8');

content = content.replace(/hivemindError\.statusCode/g, '(hivemindError as any).statusCode');
content = content.replace(/hivemindError\.message/g, '(hivemindError as any).message');
content = content.replace(/hivemindError\.code/g, '(hivemindError as any).code');

fs.writeFileSync('src/server/routes/mcp.ts', content);
