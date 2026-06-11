#!/usr/bin/env bash
# Compile the backend (src/ + transitively imported workspace packages) to dist/.
# Output layout (rootDir "./"): dist/src/**, dist/packages/<name>/src/**
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> Building backend (tsc -> dist/)"
# Drop incremental state and stale output so emit is never skipped.
rm -rf dist tsconfig.tsbuildinfo
node_modules/.bin/tsc -p tsconfig.build.json

if [ ! -f dist/src/index.js ]; then
  echo "ERROR: backend build produced no dist/src/index.js" >&2
  exit 1
fi
echo "==> Backend build complete (dist/src/index.js)"
