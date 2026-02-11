# Hướng dẫn chạy với PM2 trên VPS

## 1. Clone code từ GitHub

```bash
# Clone repository
git clone https://github.com/huanht20/claw-mint.git

# Hoặc nếu đã có SSH key setup:
# git clone git@github.com:huanht20/claw-mint.git

# Di chuyển vào thư mục
cd claw-mint
```

## 2. Cài đặt PM2

```bash
npm install -g pm2
```

## 3. Cài đặt dependencies

```bash
npm install
```

## 4. Cài đặt Python dependencies (cho script update proxy)

```bash
python3 -m venv venv
source venv/bin/activate
pip install requests
```

## 5. Cấu hình file

### Copy file config từ máy local lên VPS:

**Cách 1: Sử dụng SCP (từ máy local)**
```bash
# Copy config.js
scp config.js user@vps-ip:/path/to/claw-mint/

# Copy moltbook_accounts.json
scp moltbook_accounts.json user@vps-ip:/path/to/claw-mint/
```

**Cách 2: Tạo mới trên VPS**
```bash
# Copy config.example.js thành config.js
cp config.example.js config.js

# Chỉnh sửa config.js
nano config.js  # hoặc vi config.js

# Tạo file moltbook_accounts.json (có thể tạo mới bằng register_moltbook.js)
# Hoặc copy từ máy local bằng SCP
```

**Lưu ý:** 
- File `config.js` và `moltbook_accounts.json` không được commit lên git (đã có trong .gitignore)
- Cần copy thủ công từ máy local lên VPS hoặc tạo mới trên VPS

## 6. Chạy với PM2

### Chạy mint post (tự động lặp lại):
```bash
pm2 start ecosystem.config.js --only mint-post
```

### Chạy mint post với tham số lặp lại (ví dụ: mỗi 60 phút):
```bash
pm2 start ecosystem.config.js --only mint-post -- 60
```

### Chạy link wallet:
```bash
pm2 start ecosystem.config.js --only link-wallet
```

### Chạy index agent:
```bash
pm2 start ecosystem.config.js --only index-agent
```

## 7. Các lệnh PM2 thường dùng

```bash
# Xem danh sách processes
pm2 list

# Xem logs
pm2 logs mint-post
pm2 logs --lines 100  # Xem 100 dòng cuối

# Dừng process
pm2 stop mint-post

# Restart process
pm2 restart mint-post

# Xóa process khỏi PM2
pm2 delete mint-post

# Xem thông tin chi tiết
pm2 show mint-post

# Monitor real-time
pm2 monit

# Lưu cấu hình hiện tại để tự động start khi reboot
pm2 save
pm2 startup  # Chạy lệnh này và làm theo hướng dẫn
```

## 8. Cấu hình tự động start khi reboot

```bash
pm2 save
pm2 startup
# Chạy lệnh mà PM2 đưa ra (thường là sudo ...)
```

## 9. Xem logs

Logs được lưu tại:
- `./log/pm2-out.log` - Output logs
- `./log/pm2-error.log` - Error logs
- `./log/mint_mbc20_YYYY-MM-DD.log` - Application logs

Xem logs real-time:
```bash
pm2 logs mint-post --lines 50
```

## 10. Update code mới

### Cách 1: Pull code mới từ GitHub
```bash
# Di chuyển vào thư mục project
cd /path/to/claw-mint

# Pull code mới
git pull origin main

# Install dependencies mới (nếu có)
npm install

# Restart PM2
pm2 restart mint-post
```

### Cách 2: Nếu có thay đổi local (không nên trên VPS)
```bash
# Xem thay đổi
git status

# Discard thay đổi local (nếu cần)
git reset --hard origin/main

# Pull code mới
git pull origin main

# Install dependencies mới (nếu có)
npm install

# Restart PM2
pm2 restart mint-post
```

## 11. Chạy script update proxy live

```bash
# Activate virtual environment
source venv/bin/activate

# Chạy script
python update_proxy_live.py
```

