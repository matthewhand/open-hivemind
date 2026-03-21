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
if [ -d "src/client/dist" ]; then
  cp -r src/client/dist/* dist/client/
else
  echo "❌ Frontend build directory src/client/dist not found!"
  exit 1
fi

# 5. Compiling Serverless Function
echo "🔹 Compiling serverless function..."
mkdir -p dist/netlify/functions
# Use npx tsc to compile the specific file
npx esbuild src/netlify/functions/server.ts --bundle --platform=node --target=node18 --external:better-sqlite3 --external:pg-native --outfile=dist/netlify/functions/server.js

# 6. Verification
echo "🔹 Build artifacts:"
ls -F dist/client/
ls -F dist/netlify/functions/

echo "✅ Netlify build complete!"

# Verification (optional)
if [[ "${1:-}" == "--verify" ]]; then
  echo "🔍 Verifying build output structure..."
  
  if [ -d "dist" ] && [ -d "dist/client" ]; then
    echo "✅ dist/client assets found"
  else
    echo "❌ dist/client assets missing!"
    exit 1
  fi

  if [ -f "dist/netlify/functions/server.js" ]; then
    echo "✅ Netlify function found"
  else
    echo "❌ Netlify function missing!"
    exit 1
  fi
  
  echo "🎉 All verification checks passed!"
fi
