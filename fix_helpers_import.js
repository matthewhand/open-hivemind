const fs = require('fs');

const helpersPath = 'src/server/routes/health/helpers.ts';
let helpersContent = fs.readFileSync(helpersPath, 'utf8');

helpersContent = helpersContent.replace(/import \{ HEALTH_THRESHOLDS \} from '\.\.\/types\/constants';/, "import { HEALTH_THRESHOLDS } from '../../../types/constants';");
helpersContent = helpersContent.replace(/import \{ HEALTH_THRESHOLDS \} from '\.\.\/\.\.\/types\/constants';/, "import { HEALTH_THRESHOLDS } from '../../../types/constants';");

fs.writeFileSync(helpersPath, helpersContent);
