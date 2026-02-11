# Hướng dẫn cài đặt Node.js v22.8.0 trên VPS

## Cách 1: Sử dụng nvm (Khuyến nghị)

```bash
# 1. Cài đặt nvm (nếu chưa có)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# 2. Reload shell
source ~/.bashrc

# 3. Cài đặt Node.js v22.8.0
nvm install 22.8.0

# 4. Sử dụng Node.js v22.8.0
nvm use 22.8.0

# 5. Đặt làm version mặc định
nvm alias default 22.8.0

# 6. Kiểm tra version
node -v
npm -v
```

## Cách 2: Cài đặt trực tiếp từ NodeSource

```bash
# 1. Thêm NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -

# 2. Cài đặt Node.js
sudo apt-get install -y nodejs

# 3. Kiểm tra version (có thể không chính xác 22.8.0, nhưng sẽ là 22.x)
node -v
npm -v
```

## Cách 3: Cài đặt từ binary (chính xác v22.8.0)

```bash
# 1. Tải binary
cd /tmp
wget https://nodejs.org/dist/v22.8.0/node-v22.8.0-linux-x64.tar.xz

# 2. Giải nén
tar -xJf node-v22.8.0-linux-x64.tar.xz

# 3. Di chuyển vào thư mục system
sudo mv node-v22.8.0-linux-x64 /opt/node-v22.8.0

# 4. Tạo symlink
sudo ln -sf /opt/node-v22.8.0/bin/node /usr/local/bin/node
sudo ln -sf /opt/node-v22.8.0/bin/npm /usr/local/bin/npm
sudo ln -sf /opt/node-v22.8.0/bin/npx /usr/local/bin/npx

# 5. Kiểm tra
node -v
npm -v
```

## Sau khi cài đặt xong:

```bash
cd ~/project/claw-mint

# Xóa node_modules và package-lock.json cũ
rm -rf node_modules package-lock.json

# Cài đặt lại dependencies
npm install

# Chạy lại
node mint_post.js
```

## Lưu ý:

- Nếu đã có Node.js cũ, nên xóa trước khi cài mới
- Nếu dùng nvm, đảm bảo reload shell sau khi cài
- Kiểm tra `which node` để xem Node.js đang được load từ đâu

