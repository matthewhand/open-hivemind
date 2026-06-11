#!/usr/bin/env bash
# Full production build: backend (tsc -> dist/) then frontend (vite -> src/client/dist).
set -euo pipefail
cd "$(dirname "$0")/.."

bash scripts/build-backend.sh
bash scripts/build-frontend.sh

echo "==> Build complete"
