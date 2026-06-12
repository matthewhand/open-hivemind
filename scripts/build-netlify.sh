#!/bin/bash
set -e

echo "==> Starting Netlify build..."

# Ensure directories exist
mkdir -p dist/client
mkdir -p dist/netlify/functions

echo "==> Building frontend..."
npm run build:frontend

echo "==> Moving frontend to publish directory..."
# Netlify publishes from dist/client
rm -rf dist/client/*
cp -r src/client/dist/* dist/client/

# Remove duplicated redirect and header rules that conflict with netlify.toml
rm -f dist/client/_redirects
rm -f dist/client/_headers

echo "==> Compiling serverless function..."
# Compile the typescript function using commonjs module
npx tsc src/netlify/functions/server.ts \
  --outDir dist/netlify/functions \
  --esModuleInterop \
  --module commonjs \
  --target es2018 \
  --skipLibCheck

echo "==> Netlify build complete."
