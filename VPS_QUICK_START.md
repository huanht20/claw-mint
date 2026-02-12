# Quick Start Guide cho VPS

## Bước 1: Kiểm tra Node.js và npm

```bash
node --version
npm --version
```

Nếu chưa có, cài đặt:
```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Hoặc dùng nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
```

## Bước 2: Cài đặt PM2

```bash
npm install -g pm2
```

## Bước 3: Cài đặt dependencies

```bash
cd ~/project/claw-mint
npm install
```

## Bước 4: Cài đặt Python dependencies

```bash
python3 -m venv venv
source venv/bin/activate
pip install requests
```

## Bước 5: Copy file config từ máy local

Từ máy local của bạn, chạy:
```bash
scp config.js root@207.148.116.58:~/project/claw-mint/
scp moltbook_accounts.json root@207.148.116.58:~/project/claw-mint/
```

Hoặc tạo mới trên VPS:
```bash
cp config.example.js config.js
nano config.js  # Điền thông tin
```

## Bước 6: Chạy với PM2

### Chạy mint post 1 lần:
```bash
pm2 start ecosystem.config.js --only mint-post
```

### Chạy mint post lặp lại mỗi 60 phút:
```bash
pm2 start ecosystem.config.js --only mint-post -- 60
```

## Bước 7: Lưu cấu hình PM2

```bash
pm2 save
pm2 startup
# Chạy lệnh mà PM2 đưa ra
```

## Bước 8: Xem logs

```bash
pm2 logs mint-post
pm2 list
```

## Các lệnh hữu ích

```bash
# Xem status
pm2 status

# Restart
pm2 restart mint-post

# Stop
pm2 stop mint-post

# Xem logs real-time
pm2 logs mint-post --lines 50

# Monitor
pm2 monit
```

