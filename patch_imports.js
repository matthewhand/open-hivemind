const fs = require('fs');
const path = 'src/client/src/components/Dashboard/AgentCard.tsx';
let content = fs.readFileSync(path, 'utf8');
content = content.replace(/import type \{ Agent \} from '\.\.\/\.\.\/\.\.\/services\/agentService';/, "import type { Agent } from '../../services/agentService';");
content = content.replace(/import \{ useProviders, type ProviderInfo \} from '\.\.\/\.\.\/\.\.\/hooks\/useProviders';/, "import { useProviders, type ProviderInfo } from '../../hooks/useProviders';");
fs.writeFileSync(path, content);
