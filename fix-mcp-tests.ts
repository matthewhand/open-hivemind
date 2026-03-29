import * as fs from 'fs';

const files = [
  'tests/api/admin-endpoints.test.ts',
  'tests/api/mcp-endpoints.test.ts',
  'tests/api/dashboard-api.test.ts',
  'tests/api/health-api.test.ts',
  'tests/routes/health.test.ts',
  'tests/routes/admin-mcp-test.test.ts',
  'tests/routes/health.additional.test.ts',
  'tests/routes/health.api.test.ts'
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');

  // Wrap all body dot notations with data dot notations where appropriate,
  // except for 'error', 'message', 'success'.
  // We'll use a regex that matches response.body.<property> and rewrites to response.body.data.<property>
  // ONLY if <property> is not in a banned list.

  const properties = ['servers', 'server', 'tools', 'connected', 'result', 'guards', 'metrics', 'services', 'details', 'alerts'];

  for (const prop of properties) {
     const regex = new RegExp(`response\\.body\\.${prop}`, 'g');
     content = content.replace(regex, `response.body.data.${prop}`);
  }

  content = content.replace(/response\.body\.error(?!\.details)/g, 'response.body.error.details.error');

  fs.writeFileSync(file, content);
}
