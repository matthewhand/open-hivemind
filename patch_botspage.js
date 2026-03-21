const fs = require('fs');

const content = fs.readFileSync('src/client/src/pages/BotsPage.tsx', 'utf8');
const resolved = content.replace(/<<<<<<< HEAD\n([\s\S]*?)=======\n([\s\S]*?)>>>>>>> origin\/main\n?/g, '$2');
fs.writeFileSync('src/client/src/pages/BotsPage.tsx', resolved, 'utf8');
