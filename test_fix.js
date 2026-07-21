const { readFileSync } = require('fs');
const content = readFileSync('src/client/src/components/Dashboard/AgentGrid.tsx', 'utf8');
console.log(content.includes('SkeletonGrid'));
