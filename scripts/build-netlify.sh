#!/bin/bash
set -e

echo "[build:netlify] Starting Netlify build..."

# Build the frontend
bash scripts/build-frontend.sh

# Ensure dist structure matches netlify.toml expectation
echo "[build:netlify] Organizing build artifacts..."
mkdir -p dist/client
cp -r src/client/dist/* dist/client/

# Compile serverless functions
echo "[build:netlify] Compiling serverless functions..."
mkdir -p dist/netlify/functions
npx tsc src/netlify/functions/server.ts --outDir dist/netlify/functions --esModuleInterop --module commonjs --target es2018 --skipLibCheck

# Clean up any generated files in the publish directory that might conflict with netlify.toml
rm -f dist/client/_redirects
rm -f dist/client/_headers

echo "[build:netlify] Netlify build complete!"
