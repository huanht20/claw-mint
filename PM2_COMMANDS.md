# PM2 Commands - Hướng dẫn chạy với PM2

## Chạy mint_post.js với PM2

### Cách 1: Chạy trực tiếp file (Đơn giản nhất)

#### Chạy 1 lần (không lặp lại):
```bash
pm2 start mint_post.js --name mint-post
```

#### Chạy lặp lại mỗi X phút (ví dụ: 60 phút):
```bash
pm2 start mint_post.js --name mint-post -- 60
```

#### Chạy với tham số khác:
```bash
# Lặp lại mỗi 30 phút
pm2 start mint_post.js --name mint-post -- 30

# Lặp lại mỗi 120 phút (2 giờ)
pm2 start mint_post.js --name mint-post -- 120
```

### Cách 2: Sử dụng ecosystem.config.js

#### Chạy 1 lần (không lặp lại):
```bash
pm2 start ecosystem.config.js --only mint-post
```

#### Chạy lặp lại mỗi X phút (ví dụ: 60 phút):
```bash
pm2 start ecosystem.config.js --only mint-post -- 60
```

### So sánh 2 cách:

**Cách 1 (trực tiếp):**
- ✅ Đơn giản, nhanh
- ✅ Không cần file config
- ❌ Không có cấu hình chi tiết (logs, memory limit, etc.)

**Cách 2 (ecosystem.config.js):**
- ✅ Cấu hình đầy đủ (logs, memory, restart, etc.)
- ✅ Dễ quản lý nhiều apps
- ❌ Cần file config

## Các lệnh PM2 thường dùng

### Xem danh sách processes:
```bash
pm2 list
```

### Xem logs:
```bash
# Xem logs real-time
pm2 logs mint-post

# Xem logs với số dòng
pm2 logs mint-post --lines 100

# Xem logs và theo dõi
pm2 logs mint-post --lines 50 --raw
```

### Dừng process:
```bash
pm2 stop mint-post
```

### Restart process:
```bash
pm2 restart mint-post
```

### Xóa process khỏi PM2:
```bash
pm2 delete mint-post
```

### Xem thông tin chi tiết:
```bash
pm2 show mint-post
```

### Monitor real-time:
```bash
pm2 monit
```

### Lưu cấu hình để tự động start khi reboot:
```bash
pm2 save
pm2 startup
# Chạy lệnh mà PM2 đưa ra (thường là sudo ...)
```

## Xem logs từ file

Logs được lưu tại:
- `./log/pm2-out.log` - Output logs
- `./log/pm2-error.log` - Error logs
- `./log/mint_mbc20_YYYY-MM-DD.log` - Application logs

```bash
# Xem logs output
tail -f ./log/pm2-out.log

# Xem logs error
tail -f ./log/pm2-error.log

# Xem logs application
tail -f ./log/mint_mbc20_$(date +%Y-%m-%d).log
```

## Chạy các file khác

### Chạy link_wallet.js:
```bash
pm2 start link_wallet.js --name link-wallet
```

### Chạy index_agent.js:
```bash
pm2 start index_agent.js --name index-agent
```

## Troubleshooting

### Nếu process không chạy:
```bash
# Kiểm tra logs
pm2 logs mint-post --err

# Xem thông tin chi tiết
pm2 show mint-post

# Restart
pm2 restart mint-post
```

### Nếu gặp lỗi khi chạy trực tiếp:
- Đảm bảo đang ở đúng thư mục chứa file
- Kiểm tra file có tồn tại: `ls -la mint_post.js`
- Thử chạy với đường dẫn đầy đủ: `pm2 start /path/to/mint_post.js --name mint-post`

### Nếu gặp lỗi ES modules:
- Đảm bảo `package.json` có `"type": "module"`
- Đảm bảo Node.js version >= 18.x (khuyến nghị >= 22.x)

### Xóa tất cả processes:
```bash
pm2 delete all
```

