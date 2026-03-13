const fs = require('fs');

const file = 'src/client/src/components/Monitoring/MonitoringDashboard.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace("import { Card, Badge, Alert, Button, PageHeader, StatsCards } from '../DaisyUI';",
`import Card from '../DaisyUI/Card';
import Badge from '../DaisyUI/Badge';
import Alert from '../DaisyUI/Alert';
import Button from '../DaisyUI/Button';
import PageHeader from '../DaisyUI/PageHeader';
import StatsCards from '../DaisyUI/StatsCards';`);

fs.writeFileSync(file, code);
