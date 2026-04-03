const fs = require('fs');
const { execSync } = require('child_process');

const envSample = fs.readFileSync('.env.sample', 'utf8');
const envVarsInSample = Array.from(envSample.matchAll(/^[#\s]*([A-Z_0-9]+)=/gm)).map(m => m[1]);

const grepResult = execSync("grep -ro 'process\\.env\\.[A-Z_0-9]*' src/ | cut -d: -f2 | sort -u").toString();
const envVarsInCode = grepResult.split('\n').map(l => l.replace('process.env.', '')).filter(l => l.length > 0);

const missing = envVarsInCode.filter(v => !envVarsInSample.includes(v));

console.log("Missing in .env.sample:");
console.log(missing.join('\n'));
