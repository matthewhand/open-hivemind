#!/bin/bash
set -e

echo "[validate] Running lint..."
npm run lint

echo "[validate] Running tests..."
npm run test

echo "[validate] Validation complete!"
