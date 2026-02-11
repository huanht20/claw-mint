#!/bin/bash

# Script cài đặt Node.js v22.8.0 trên VPS
# Chạy: bash install_node22.sh

echo "🚀 Đang cài đặt Node.js v22.8.0..."

# Kiểm tra nvm
if ! command -v nvm &> /dev/null; then
    echo "📦 Đang cài đặt nvm..."
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
    
    # Load nvm
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
    
    echo "✅ nvm đã được cài đặt"
else
    echo "✅ nvm đã có sẵn"
    # Load nvm
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
fi

# Cài đặt Node.js v22.8.0
echo "📦 Đang cài đặt Node.js v22.8.0..."
nvm install 22.8.0

# Sử dụng Node.js v22.8.0
echo "🔄 Đang chuyển sang Node.js v22.8.0..."
nvm use 22.8.0

# Đặt làm mặc định
echo "⚙️  Đặt Node.js v22.8.0 làm mặc định..."
nvm alias default 22.8.0

# Kiểm tra
echo ""
echo "✅ Kiểm tra version:"
node -v
npm -v

echo ""
echo "✅ Hoàn tất! Node.js v22.8.0 đã được cài đặt."
echo ""
echo "💡 Lưu ý: Nếu chạy script trong shell mới, cần reload:"
echo "   source ~/.bashrc"
echo ""
echo "📦 Bây giờ chạy:"
echo "   cd ~/project/claw-mint"
echo "   rm -rf node_modules package-lock.json"
echo "   npm install"
echo "   node mint_post.js"

