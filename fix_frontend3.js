const fs = require('fs');

const file = 'src/client/src/pages/MCPServersPage/hooks/useMCPServerActions.ts';
let content = fs.readFileSync(file, 'utf8');

// It's importing getAuthHeaders from src/services/api.ts which is actually a private method of ApiService now.
// Let's change the import to apiService and use apiService.getHeaders() or we can fetch token manually.

// Actually, how did the code look before?
const { execSync } = require('child_process');
execSync(`git checkout ${file}`);

let newContent = fs.readFileSync(file, 'utf8');
console.log(newContent.split('\n')[1]);
