#!/bin/bash

# =====================================================
# JAIPUR Furniture - VPS Update Script
# Run this on your Hostinger VPS to update the application
# =====================================================

set -e  # Exit on any error

echo "========================================"
echo "  JAIPUR Furniture - VPS Update Script"
echo "========================================"
echo ""

# Navigate to project directory (adjust if different)
cd /var/www/jaipur-furniture || cd ~/jaipur-furniture || {
    echo "❌ Project directory not found!"
    echo "Please update the 'cd' path in this script"
    exit 1
}

echo "📁 Working directory: $(pwd)"
echo ""

# Step 1: Stop services
echo "🛑 Stopping services..."
pm2 stop all 2>/dev/null || echo "PM2 not running or no processes"
echo ""

# Step 2: Discard local changes and pull latest code
echo "📥 Pulling latest code from GitHub..."
git fetch origin
git reset --hard origin/main
echo "✅ Code updated successfully"
echo ""

# Step 3: Clear npm/yarn cache
echo "🧹 Clearing frontend cache..."
cd frontend
rm -rf node_modules/.cache 2>/dev/null || true
rm -rf build 2>/dev/null || true
rm -rf .cache 2>/dev/null || true

# Step 4: Install frontend dependencies
echo "📦 Installing frontend dependencies..."
yarn install --frozen-lockfile || yarn install
echo ""

# Step 5: Build frontend with fresh cache
echo "🔨 Building frontend..."
yarn build
echo "✅ Frontend build complete"
echo ""

# Step 6: Backend setup
cd ../backend
echo "🐍 Installing backend dependencies..."
pip install -r requirements.txt --quiet
echo "✅ Backend dependencies installed"
echo ""

# Step 7: Clear Python cache
echo "🧹 Clearing Python cache..."
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
find . -type f -name "*.pyc" -delete 2>/dev/null || true
echo ""

# Step 8: Restart services
echo "🚀 Starting services..."
cd ..

# Start backend
pm2 start backend/server.py --name backend --interpreter python3 -- || pm2 restart backend

# Start frontend (serve build folder)
pm2 start "npx serve -s frontend/build -l 3000" --name frontend || pm2 restart frontend

# Save PM2 configuration
pm2 save

echo ""
echo "========================================"
echo "  ✅ UPDATE COMPLETE!"
echo "========================================"
echo ""
echo "Services status:"
pm2 status
echo ""
echo "To view logs: pm2 logs"
echo "To restart:   pm2 restart all"
