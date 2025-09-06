#!/bin/bash
# Build XPI script for Pixelbot extension

# Exit on error
set -e

echo "🔧 Building Pixelbot extension..."

# Step 1: Build the extension code
echo "📦 Building extension code..."
pnpm build

# Step 2: Create XPI with web-ext, ignoring development files
echo "🗜️  Creating XPI package..."
web-ext build \
  --overwrite-dest \
  --ignore-files 'references/**' \
  --ignore-files 'scripts/**' \
  --ignore-files 'node_modules/**' \
  --ignore-files '.git/**' \
  --ignore-files '*.md' \
  --ignore-files 'package*.json' \
  --ignore-files '.*'

# Step 3: Rename and finalize
echo "✨ Renaming to pixelbot.xpi..."
node scripts/rename-xpi.js

# Development summary
echo ""
echo "🎉 Build completed successfully!"
echo ""
echo "🔄 To install/reload in Firefox:"
echo "1. Go to: about:debugging#/runtime/this-firefox"
echo "2. Click 'Load Temporary Add-on' (or Reload if already installed)"
echo "3. Select: web-ext-artifacts/pixelbot.xpi"
echo ""
echo "💡 Tip: Use Firefox Developer Edition with signatures disabled for permanent installs"
