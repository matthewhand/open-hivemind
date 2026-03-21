const fs = require('fs');

const content = fs.readFileSync('src/client/src/pages/BotsPage.tsx', 'utf8');

// The file has multiple conflict markers. We need to replace all of them
// with the bottom block (origin/main).
const resolved = content.replace(/<<<<<<< HEAD\n([\s\S]*?)=======\n([\s\S]*?)>>>>>>> [a-f0-9]{40}\n?/g, '$2')
                        .replace(/<<<<<<< HEAD\n([\s\S]*?)=======\n([\s\S]*?)>>>>>>> origin\/main\n?/g, '$2');

fs.writeFileSync('src/client/src/pages/BotsPage.tsx', resolved, 'utf8');
console.log('Fixed BotsPage.tsx');
