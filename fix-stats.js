const fs = require('fs');
const content = fs.readFileSync('src/client/src/components/DaisyUI/StatsCards.tsx', 'utf8');
const fixed = content.replace(/=======\nimport React from 'react';\nexport const StatsCards: React.FC<any> = \(\) => <div \/>;\nexport default StatsCards;\n/, '');
fs.writeFileSync('src/client/src/components/DaisyUI/StatsCards.tsx', fixed);
