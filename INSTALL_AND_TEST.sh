#!/bin/bash

echo "🚀 Context Pills Sunburst - Installation & Testing"
echo "=================================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}Step 1: Installing dependencies...${NC}"
pnpm install

echo ""
echo -e "${BLUE}Step 2: Building extension...${NC}"
pnpm build

echo ""
echo -e "${GREEN}✓ Build complete!${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Open Chrome and go to: chrome://extensions"
echo "2. Enable 'Developer mode'"
echo "3. Click 'Load unpacked' and select the 'dist' folder"
echo ""
echo "4. Enable Chrome flags:"
echo "   - chrome://flags/#optimization-guide-on-device-model → Enabled"
echo "   - chrome://flags/#prompt-api-for-gemini-nano → Enabled"
echo "   - Restart Chrome"
echo ""
echo "5. Download Gemini Nano (in DevTools console):"
echo "   await ai.languageModel.create();"
echo ""
echo "6. Run the test:"
echo "   node chrome-extension/test-prompt-api-gmail.js"
echo ""
echo -e "${GREEN}📚 Documentation:${NC}"
echo "   - Quick Start: QUICK_START_CONTEXT_PILLS.md"
echo "   - Testing Guide: PROMPT_API_TESTING_GUIDE.md"
echo "   - Implementation: CONTEXT_PILLS_SUNBURST_IMPLEMENTATION.md"
echo ""
echo -e "${GREEN}🎉 Ready to test!${NC}"
