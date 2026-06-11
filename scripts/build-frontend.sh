#!/usr/bin/env bash
# Build the WebUI with Vite. Output: src/client/dist (served by the server in production).
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> Building frontend (vite -> src/client/dist)"
cd src/client
../../node_modules/.bin/vite build

if [ ! -f dist/index.html ]; then
  echo "ERROR: frontend build produced no dist/index.html" >&2
  exit 1
fi
echo "==> Frontend build complete (src/client/dist)"
