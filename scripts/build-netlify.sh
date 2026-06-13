#!/bin/bash
set -e

echo "Building frontend for Netlify..."
npm run build:frontend

echo "Compiling serverless functions for Netlify..."
npx tsc src/netlify/functions/server.ts --outDir dist/netlify/functions --esModuleInterop --module commonjs --target es2018 --skipLibCheck

echo "Removing conflicting redirect/header files to rely on netlify.toml..."
rm -f src/client/dist/_redirects
rm -f src/client/dist/_headers


echo "Netlify build complete."
