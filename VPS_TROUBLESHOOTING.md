# VPS Troubleshooting Guide

## Lỗi: SyntaxError: Unexpected token {

### Nguyên nhân:
- Node.js version quá cũ (cần >= 14.x để hỗ trợ ES modules)
- File `package.json` thiếu `"type": "module"`

### Giải pháp:

#### 1. Kiểm tra Node.js version trên VPS:
```bash
node -v
```

Nếu version < 14, cần cài đặt Node.js mới hơn:
```bash
# Sử dụng nvm (khuyến nghị)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18

# Hoặc cài đặt trực tiếp từ NodeSource
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

#### 2. Kiểm tra file package.json:
```bash
cd ~/project/claw-mint
cat package.json
```

Đảm bảo file có dòng:
```json
"type": "module"
```

Nếu chưa có, thêm vào:
```bash
# Backup file cũ
cp package.json package.json.backup

# Thêm "type": "module" vào package.json
cat > package.json << 'EOF'
{
  "name": "mint-claw",
  "version": "1.0.0",
  "description": "Moltbook registration tool",
  "type": "module",
  "main": "register_moltbook.js",
  "scripts": {
    "register": "node register_moltbook.js",
    "mint": "node mint_post.js",
    "link": "node link_wallet.js"
  },
  "keywords": [
    "moltbook",
    "agent",
    "registration"
  ],
  "author": "",
  "license": "MIT",
  "dependencies": {
    "proxy-agent": "^6.5.0",
    "undici": "^7.21.0"
  }
}
EOF
```

#### 3. Cài đặt dependencies:
```bash
cd ~/project/claw-mint
npm install
```

#### 4. Chạy lại:
```bash
node mint_post.js
```

### Nếu vẫn lỗi, thử chạy với flag:
```bash
node --experimental-json-modules mint_post.js
```

### Hoặc sử dụng npm script:
```bash
npm run mint
```

