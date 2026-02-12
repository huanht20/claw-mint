#!/bin/bash

# Script để upload config.js và moltbook_accounts.json lên VPS
# Sử dụng: ./upload_to_vps.sh

VPS_USER="root"
VPS_IP="207.148.116.58"
VPS_PATH="~/project/claw-mint"

echo "Đang upload config.js..."
scp config.js ${VPS_USER}@${VPS_IP}:${VPS_PATH}/

echo "Đang upload moltbook_accounts.json..."
scp moltbook_accounts.json ${VPS_USER}@${VPS_IP}:${VPS_PATH}/

echo "✅ Hoàn tất!"

