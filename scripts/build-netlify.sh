#!/bin/bash
set -e

echo "🏗️  Building Netlify deployment..."

# 1. Build Backend
echo "🔹 Building backend..."
# Use existing build script but ensure it doesn't sleep
BUILD_POST_BUILD_SLEEP_SECONDS=0 npm run build:backend

# 2. Build Frontend
echo "🔹 Building frontend..."
npm run build:frontend

# 3. Prepare Publish Directory
echo "🔹 Preparing publish directory..."
mkdir -p dist/client
# Check for new build location (dist/client/dist) or legacy (src/client/dist)
if [ -d "dist/client/dist" ]; then
  echo "✅ Found build in dist/client/dist, copying to publish root..."
  cp -r dist/client/dist/* dist/client/
elif [ -d "src/client/dist" ]; then
  echo "⚠️  Found build in legacy location src/client/dist..."
  cp -r src/client/dist/* dist/client/
else
  echo "❌ Frontend build directory not found!"
  exit 1
fi

# 4. Compile Serverless Function
echo "🔹 Compiling serverless function..."
mkdir -p dist/netlify/functions
# Use npx tsc to compile the specific file
npx tsc netlify/functions/server.ts \
  --outDir dist/netlify/functions \
  --target es2018 \
  --module commonjs \
  --esModuleInterop \
  --allowSyntheticDefaultImports \
  --skipLibCheck \
  --moduleResolution node

echo "✅ Netlify build complete!"
