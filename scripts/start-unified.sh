#!/bin/bash

# Unified Open Hivemind Server Start Script
# This script starts the unified server with both bot and webui capabilities

set -e

echo "🚀 Starting Open Hivemind Unified Server..."

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check if frontend is built
if [ ! -d "src/client/dist" ]; then
    echo "🔨 Building frontend..."
    npm run build:frontend
fi

# Set default port if not specified
export PORT=${PORT:-3028}

# Start the unified server
if [ "$NODE_ENV" = "production" ]; then
    echo "🏭 Production mode - starting built server..."
    npm run start
else
    echo "🛠️  Development mode - starting with ts-node..."
    npm run start:dev
fi