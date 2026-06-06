#!/bin/bash
set -e

echo "[build:backend] Compiling TypeScript..."
./node_modules/.bin/tsc --noEmitOnError false --skipLibCheck

echo "[build:backend] Done."
