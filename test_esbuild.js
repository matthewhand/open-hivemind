const { execSync } = require('child_process');
try {
  execSync('npx esbuild src/netlify/functions/server.ts --bundle --platform=node --target=node20 --outfile=dist/netlify/functions/server.js --external:express --external:cors --external:serverless-http --external:sqlite3 --external:better-sqlite3 --external:mock-aws-s3 --external:nock --external:aws-sdk');
  console.error("SUCCESS!");
} catch (e) {
  console.error("FAIL", e);
}
