#!/bin/bash

echo "🚀 Building Complete Deep Agents Extension..."

# Clean everything first
echo "🧹 Cleaning previous builds..."
npm run clean:bundle

# Build all components
echo "📦 Building all packages..."
npm run build

echo "✅ Build complete!"
echo ""
echo "📋 Next steps:"
echo "1. Go to chrome://extensions/"
echo "2. Enable 'Developer mode'"
echo "3. Click 'Remove' on existing Shannon extension (if any)"
echo "4. Click 'Load unpacked'"
echo "5. Select the /dist folder"
echo "6. The extension should load without errors"
echo ""
echo "🧪 To test Deep Agents:"
echo "1. Click Shannon extension icon"
echo "2. Configure models in Settings"
echo "3. Create a new workspace"
echo "4. Start chatting to test the integration!"