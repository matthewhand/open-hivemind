#!/usr/bin/env bash
# Netlify build: WebUI to dist/client (published to the CDN) and the
# pre-bundled serverless function to dist/netlify/functions (wraps the real
# Express API in stateless demo mode — see src/server/serverlessApp.ts).
set -euo pipefail
cd "$(dirname "$0")/.."

bash scripts/build-frontend.sh

echo "==> Staging WebUI for Netlify publish (dist/client)"
rm -rf dist/client
mkdir -p dist/client
cp -r src/client/dist/. dist/client/

echo "==> Bundling Netlify function (dist/netlify/functions/server.js)"
rm -rf dist/netlify/functions
mkdir -p dist/netlify/functions
node scripts/bundle-serverless.mjs src/netlify/functions/server.ts dist/netlify/functions/server.js

echo "==> Netlify build complete"
