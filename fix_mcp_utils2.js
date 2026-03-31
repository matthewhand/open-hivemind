const fs = require('fs');

let code = `export const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: \`Bearer \${token}\` } : {}),
  };
};`;

fs.writeFileSync('src/client/src/utils/apiAuth.ts', code);

let a1 = fs.readFileSync('src/client/src/pages/MCPServersPage/hooks/useMCPServerActions.ts', 'utf8');
a1 = a1.replace(/import \{ getAuthHeaders \} from '..\/..\/..\/utils\/apiKeyValidation';/, "import { getAuthHeaders } from '../../../utils/apiAuth';");
fs.writeFileSync('src/client/src/pages/MCPServersPage/hooks/useMCPServerActions.ts', a1);

let a2 = fs.readFileSync('src/client/src/pages/MCPServersPage/hooks/useMCPServerDelete.ts', 'utf8');
a2 = a2.replace(/import \{ getAuthHeaders \} from '..\/..\/..\/utils\/apiKeyValidation';/, "import { getAuthHeaders } from '../../../utils/apiAuth';");
fs.writeFileSync('src/client/src/pages/MCPServersPage/hooks/useMCPServerDelete.ts', a2);

console.log('fixed utils api auth import');
