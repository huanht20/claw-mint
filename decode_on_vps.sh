#!/bin/bash

# Script để decode file base64 trên VPS
# Sử dụng: 
# 1. Copy nội dung từ config.js.base64 và paste vào dưới đây
# 2. Copy nội dung từ moltbook_accounts.json.base64 và paste vào dưới đây
# 3. Chạy script này trên VPS

cd ~/project/claw-mint

# Decode config.js
echo "Đang decode config.js..."
cat > /tmp/config_base64.txt << 'ENDOFFILE'
# [Paste nội dung từ config.js.base64 vào đây]
ENDOFFILE

base64 -d /tmp/config_base64.txt > config.js
rm /tmp/config_base64.txt

# Decode moltbook_accounts.json
echo "Đang decode moltbook_accounts.json..."
cat > /tmp/accounts_base64.txt << 'ENDOFFILE'
# [Paste nội dung từ moltbook_accounts.json.base64 vào đây]
ENDOFFILE

base64 -d /tmp/accounts_base64.txt > moltbook_accounts.json
rm /tmp/accounts_base64.txt

echo "✅ Hoàn tất!"

