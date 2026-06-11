#!/bin/bash
set -e

echo "==> Building frontend for Netlify..."
cd src/client
npm run build
cd ../..

echo "==> Preparing frontend distribution..."
# Move frontend build to the expected publish directory
rm -rf dist/client
mkdir -p dist/client
cp -R src/client/dist/* dist/client/

echo "==> Cleaning up conflicting Netlify configuration files from frontend build..."
# Remove generated _redirects or _headers to avoid duplication with netlify.toml
rm -f dist/client/_redirects
rm -f dist/client/_headers

echo "==> Compiling serverless backend functions..."
mkdir -p dist/netlify/functions
npx tsc src/netlify/functions/server.ts --outDir dist/netlify/functions --esModuleInterop --module commonjs --target es2018 --skipLibCheck

echo "==> Netlify build completed successfully."
