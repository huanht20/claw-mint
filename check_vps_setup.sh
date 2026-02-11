#!/bin/bash

# Script kiểm tra setup trên VPS
# Chạy: bash check_vps_setup.sh

echo "🔍 Kiểm tra setup VPS..."
echo ""

# Kiểm tra Node.js
echo "1. Kiểm tra Node.js:"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo "   ✅ Node.js đã cài đặt: $NODE_VERSION"
    
    # Kiểm tra version
    MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$MAJOR_VERSION" -lt 14 ]; then
        echo "   ⚠️  Node.js version quá cũ (cần >= 14.x)"
        echo "   💡 Chạy: nvm install 18 hoặc cài từ NodeSource"
    else
        echo "   ✅ Node.js version OK"
    fi
else
    echo "   ❌ Node.js chưa được cài đặt"
    echo "   💡 Cài đặt: curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash"
fi

echo ""

# Kiểm tra npm
echo "2. Kiểm tra npm:"
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    echo "   ✅ npm đã cài đặt: $NPM_VERSION"
else
    echo "   ❌ npm chưa được cài đặt"
fi

echo ""

# Kiểm tra package.json
echo "3. Kiểm tra package.json:"
if [ -f "package.json" ]; then
    echo "   ✅ package.json tồn tại"
    
    if grep -q '"type": "module"' package.json; then
        echo "   ✅ package.json có 'type: module'"
    else
        echo "   ❌ package.json thiếu 'type: module'"
        echo "   💡 Cần thêm \"type\": \"module\" vào package.json"
    fi
else
    echo "   ❌ package.json không tồn tại"
    echo "   💡 Chạy: git pull hoặc copy file package.json"
fi

echo ""

# Kiểm tra node_modules
echo "4. Kiểm tra dependencies:"
if [ -d "node_modules" ]; then
    echo "   ✅ node_modules tồn tại"
    
    # Kiểm tra một số package quan trọng
    if [ -d "node_modules/undici" ]; then
        echo "   ✅ undici đã cài đặt"
    else
        echo "   ⚠️  undici chưa được cài đặt"
    fi
    
    if [ -d "node_modules/proxy-agent" ]; then
        echo "   ✅ proxy-agent đã cài đặt"
    else
        echo "   ⚠️  proxy-agent chưa được cài đặt"
    fi
else
    echo "   ❌ node_modules chưa được cài đặt"
    echo "   💡 Chạy: npm install"
fi

echo ""

# Kiểm tra config files
echo "5. Kiểm tra config files:"
if [ -f "config.js" ]; then
    echo "   ✅ config.js tồn tại"
else
    echo "   ⚠️  config.js không tồn tại (cần copy từ máy local)"
fi

if [ -f "moltbook_accounts.json" ]; then
    echo "   ✅ moltbook_accounts.json tồn tại"
else
    echo "   ⚠️  moltbook_accounts.json không tồn tại (cần copy từ máy local)"
fi

echo ""

# Kiểm tra PM2
echo "6. Kiểm tra PM2:"
if command -v pm2 &> /dev/null; then
    PM2_VERSION=$(pm2 -v)
    echo "   ✅ PM2 đã cài đặt: $PM2_VERSION"
else
    echo "   ⚠️  PM2 chưa được cài đặt"
    echo "   💡 Chạy: npm install -g pm2"
fi

echo ""
echo "✅ Kiểm tra hoàn tất!"
echo ""
echo "Nếu có lỗi, xem file VPS_TROUBLESHOOTING.md để biết cách sửa."

