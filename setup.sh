#!/bin/bash

echo "╔══════════════════════════════════════════════════════════╗"
echo "║   Time Based Reverse Strategy - Setup Script            ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null
then
    echo "❌ Node.js is not installed!"
    echo "📥 Please download and install Node.js from: https://nodejs.org/"
    exit 1
fi

echo "✓ Node.js version: $(node -v)"
echo "✓ npm version: $(npm -v)"
echo ""

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo "❌ package.json not found!"
    echo "Please run this script from the project directory."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Setup completed successfully!"
    echo ""
    echo "📋 Next Steps:"
    echo "1. Start the server: npm start"
    echo "2. Open dashboard: https://eausdjpyopposite.onrender.com/dashboard.html"
    echo "3. Configure MT5:"
    echo "   - Tools → Options → Expert Advisors"
    echo "   - Allow WebRequest for: https://eausdjpyopposite.onrender.com"
    echo "4. Attach EA to M5 chart"
    echo ""
    echo "🚀 Ready to trade!"
else
    echo ""
    echo "❌ Installation failed!"
    echo "Please check the error messages above."
    exit 1
fi
