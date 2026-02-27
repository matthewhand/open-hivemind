const fs = require('fs');
const path = require('path');

const ARTIFACTS = [
  { path: 'dist/client/index.html', description: 'Frontend Entry Point' },
  { path: 'dist/client/_redirects', description: 'Netlify Redirects' },
  { path: 'dist/netlify/functions/server.js', description: 'Serverless Function' },
];

const REDIRECT_RULES = [
  { pattern: /^\/api\/\*\s+\/.netlify\/functions\/server\s+200!/, name: 'API Proxy' },
  { pattern: /^\/\*\s+\/index.html\s+200/, name: 'SPA Fallback' },
];

function verifyBuild() {
  console.log('🔍 Verifying build artifacts...');
  const rootDir = path.resolve(__dirname, '..');
  let errors = 0;

  // 1. Check file existence
  ARTIFACTS.forEach((artifact) => {
    const filePath = path.join(rootDir, artifact.path);
    if (fs.existsSync(filePath)) {
      console.log(`✅ [FOUND] ${artifact.description}: ${artifact.path}`);
    } else {
      console.error(`❌ [MISSING] ${artifact.description}: ${artifact.path}`);
      errors++;
    }
  });

  if (errors > 0) {
    console.error('Build verification failed: Missing artifacts.');
    process.exit(1);
  }

  // 2. Validate _redirects content
  console.log('🔍 Validating _redirects rules...');
  const redirectsPath = path.join(rootDir, 'dist/client/_redirects');
  const redirectsContent = fs.readFileSync(redirectsPath, 'utf8');

  REDIRECT_RULES.forEach(rule => {
    // Check if any line matches the pattern
    const lines = redirectsContent.split('\n');
    const matched = lines.some(line => rule.pattern.test(line.trim()));
    if (matched) {
      console.log(`✅ [VALID] Redirect Rule: ${rule.name}`);
    } else {
      console.error(`❌ [INVALID] Redirect Rule Missing or Malformed: ${rule.name}`);
      console.error(`   Expected pattern: ${rule.pattern}`);
      console.error(`   Actual content:\n${redirectsContent}`);
      errors++;
    }
  });

  if (errors > 0) {
    console.error(`Build verification failed with ${errors} error(s).`);
    process.exit(1);
  } else {
    console.log('🎉 Build verification passed!');
  }
}

verifyBuild();
