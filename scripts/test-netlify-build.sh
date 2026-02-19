#!/bin/bash

# Test script for Netlify build process
echo "🔧 Testing Netlify build process..."

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf dist

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Run Netlify build
echo "🏗️ Running Netlify build..."
npm run build:netlify

# Check if build succeeded
if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    
    # Verify output structure
    echo "📁 Verifying build output structure..."
    
    if [ -d "dist/client" ]; then
        echo "✅ Frontend assets found in dist/client"
    else
        echo "❌ Frontend assets not found in dist/client"
        exit 1
    fi
    
    if [ -f "dist/netlify/functions/server.js" ]; then
        echo "✅ Serverless function found in dist/netlify/functions/server.js"
    else
        echo "❌ Serverless function not found in dist/netlify/functions/server.js"
        exit 1
    fi
    
    echo "🎉 All checks passed! Ready for Netlify deployment."
    
else
    echo "❌ Build failed!"
    exit 1
fi