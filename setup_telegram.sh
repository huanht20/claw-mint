#!/bin/bash

# Script setup Telegram notifications cho PM2
# Sử dụng: bash setup_telegram.sh

echo "🔔 Setup Telegram Notifications cho PM2"
echo ""

# Kiểm tra PM2
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2 chưa được cài đặt!"
    echo "   Cài đặt: npm install -g pm2"
    exit 1
fi

echo "📋 Hướng dẫn:"
echo "1. Tạo bot: Tìm @BotFather trên Telegram, gửi /newbot"
echo "2. Lấy Bot Token từ BotFather"
echo "3. Lấy Chat ID: Tìm @userinfobot, gửi message bất kỳ"
echo ""

# Nhập Bot Token
read -p "Nhập Bot Token: " BOT_TOKEN

if [ -z "$BOT_TOKEN" ]; then
    echo "❌ Bot Token không được để trống!"
    exit 1
fi

# Nhập Chat ID
read -p "Nhập Chat ID: " CHAT_ID

if [ -z "$CHAT_ID" ]; then
    echo "❌ Chat ID không được để trống!"
    exit 1
fi

echo ""
echo "📦 Đang cài đặt pm2-telegram module..."
pm2 install pm2-telegram

echo ""
echo "⚙️  Đang cấu hình..."
pm2 set pm2-telegram:telegram_token "$BOT_TOKEN"
pm2 set pm2-telegram:telegram_chat_id "$CHAT_ID"
pm2 set pm2-telegram:events restart,exit,stop,error

echo ""
echo "✅ Đã cấu hình xong!"
echo ""
echo "📋 Kiểm tra cấu hình:"
pm2 conf pm2-telegram

echo ""
echo "🧪 Test notification (restart mint-post)..."
read -p "Bạn có muốn test ngay không? (y/n): " TEST_NOW

if [ "$TEST_NOW" = "y" ] || [ "$TEST_NOW" = "Y" ]; then
    if pm2 list | grep -q "mint-post"; then
        pm2 restart mint-post
        echo "✅ Đã restart mint-post. Kiểm tra Telegram để xem thông báo!"
    else
        echo "⚠️  mint-post chưa được start. Bạn có thể test sau bằng:"
        echo "   pm2 restart mint-post"
    fi
fi

echo ""
echo "💾 Lưu cấu hình..."
pm2 save

echo ""
echo "✅ Hoàn tất! Telegram notifications đã được setup."
echo ""
echo "📝 Các lệnh hữu ích:"
echo "   - Xem logs: pm2 logs pm2-telegram"
echo "   - Xem cấu hình: pm2 conf pm2-telegram"
echo "   - Test: pm2 restart mint-post"

