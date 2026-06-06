#!/bin/bash
set -e

echo "[build:frontend] Building Vite application..."
cd src/client
npm run build
cd ../..

echo "[build:frontend] Done."
