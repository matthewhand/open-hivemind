const fs = require('fs');

const file1 = 'src/client/src/pages/MCPServersPage/hooks/useMCPServerActions.ts';
let c1 = fs.readFileSync(file1, 'utf8');
c1 = c1.replace(`import { getAuthHeaders } from '../../../utils/api';`, `const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: \`Bearer \${token}\` } : {};
};`);
fs.writeFileSync(file1, c1, 'utf8');

const file2 = 'src/client/src/pages/MCPServersPage/hooks/useMCPServerDelete.ts';
let c2 = fs.readFileSync(file2, 'utf8');
c2 = c2.replace(`import { getAuthHeaders } from '../../../utils/api';`, `const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: \`Bearer \${token}\` } : {};
};`);
fs.writeFileSync(file2, c2, 'utf8');
