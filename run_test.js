const { exec } = require('child_process');
exec('pnpm exec jest tests/integration/import-export.integration.test.ts --verbose=false', (error, stdout, stderr) => {
  console.log(stdout);
});
