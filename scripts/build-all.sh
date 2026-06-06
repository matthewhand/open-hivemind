#!/bin/bash
set -e

echo "[build] Starting full build..."

bash scripts/build-backend.sh
bash scripts/build-frontend.sh

echo "[build] Build complete!"
