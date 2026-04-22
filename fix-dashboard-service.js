const fs = require('fs');
const file = 'src/server/services/DashboardService.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace('demoService.isDemoModeEnabled()', 'demoService.isInDemoMode()');

fs.writeFileSync(file, content);
