const fs = require('fs');
let code = fs.readFileSync('src/client/src/pages/MCPServersPage/hooks/useMCPServerActions.ts', 'utf8');
code = code.replace(/import \{ getAuthHeaders \} from '..\/..\/..\/utils\/api';/, "import { getAuthHeaders } from '../../../utils/apiKeyValidation';");
fs.writeFileSync('src/client/src/pages/MCPServersPage/hooks/useMCPServerActions.ts', code);

let code2 = fs.readFileSync('src/client/src/pages/MCPServersPage/hooks/useMCPServerDelete.ts', 'utf8');
code2 = code2.replace(/import \{ getAuthHeaders \} from '..\/..\/..\/utils\/api';/, "import { getAuthHeaders } from '../../../utils/apiKeyValidation';");
fs.writeFileSync('src/client/src/pages/MCPServersPage/hooks/useMCPServerDelete.ts', code2);
console.log('fixed utils api import');
