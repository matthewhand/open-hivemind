#!/usr/bin/env bash
# Production runtime entrypoint: run the compiled backend (dist/src/index.js).
# Builds first when output is missing or RUNTIME_BUILD_ON_START=true.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ "${RUNTIME_BUILD_ON_START:-false}" = "true" ] || [ ! -f dist/src/index.js ]; then
  echo "==> dist/src/index.js missing or RUNTIME_BUILD_ON_START=true — running build"
  bash scripts/build-all.sh
fi

exec node dist/src/index.js
