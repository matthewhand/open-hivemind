#!/bin/bash
set -e

echo "[build:netlify] Starting Netlify build..."

# Build the frontend
bash scripts/build-frontend.sh

# Compile serverless functions
echo "[build:netlify] Compiling serverless functions..."
mkdir -p dist/netlify/functions
npx tsc src/netlify/functions/server.ts --outDir dist/netlify/functions --esModuleInterop --module commonjs --target es2018 --skipLibCheck

# Clean up any generated files that might conflict with netlify.toml
rm -f src/client/dist/_redirects
rm -f src/client/dist/_headers

echo "[build:netlify] Netlify build complete!"
