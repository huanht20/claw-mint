# Setup Telegram Notifications cho PM2

## Bước 1: Tạo Telegram Bot

1. Mở Telegram và tìm **@BotFather**
2. Gửi lệnh: `/newbot`
3. Làm theo hướng dẫn:
   - Nhập tên bot (ví dụ: `PM2 Monitor Bot`)
   - Nhập username bot (phải kết thúc bằng `bot`, ví dụ: `pm2_monitor_bot`)
4. BotFather sẽ cung cấp **Bot Token**, copy lại (ví dụ: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

## Bước 2: Lấy Chat ID

### Cách 1: Sử dụng @userinfobot (Đơn giản nhất)
1. Tìm **@userinfobot** trên Telegram
2. Gửi bất kỳ message nào (ví dụ: `/start`)
3. Bot sẽ trả về thông tin của bạn, trong đó có **Chat ID** (số dương, ví dụ: `123456789`)

### Cách 2: Gửi message cho bot của bạn
1. Tìm bot bạn vừa tạo (username bạn đã đặt)
2. Gửi message bất kỳ (ví dụ: `/start`)
3. Truy cập: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
4. Tìm `"chat":{"id":123456789}` trong response, đó là Chat ID

## Bước 3: Cài đặt PM2 Telegram Module

Trên VPS, chạy các lệnh sau:

```bash
# 1. Cài đặt module
pm2 install pm2-telegram

# 2. Cấu hình Bot Token (thay YOUR_BOT_TOKEN bằng token bạn đã lấy)
pm2 set pm2-telegram:telegram_token YOUR_BOT_TOKEN

# 3. Cấu hình Chat ID (thay YOUR_CHAT_ID bằng Chat ID của bạn)
pm2 set pm2-telegram:telegram_chat_id YOUR_CHAT_ID

# 4. Cấu hình events (khi nào sẽ gửi thông báo)
pm2 set pm2-telegram:events restart,exit,stop,error

# 5. Kiểm tra cấu hình
pm2 conf pm2-telegram
```

## Bước 4: Test Notifications

```bash
# Restart một app để test
pm2 restart mint-post

# Hoặc stop app
pm2 stop mint-post

# Sau đó start lại
pm2 start mint-post
```

Bạn sẽ nhận được thông báo trên Telegram!

## Bước 5: Lưu cấu hình

```bash
pm2 save
```

## Các Events có thể cấu hình

```bash
# Tất cả events
pm2 set pm2-telegram:events restart,exit,stop,error,delete

# Chỉ restart và stop
pm2 set pm2-telegram:events restart,stop

# Chỉ error
pm2 set pm2-telegram:events error
```

## Xem logs của module

```bash
# Xem logs
pm2 logs pm2-telegram

# Xem cấu hình hiện tại
pm2 conf pm2-telegram
```

## Troubleshooting

### Không nhận được thông báo:

1. **Kiểm tra Bot Token:**
```bash
pm2 conf pm2-telegram
# Xem telegram_token có đúng không
```

2. **Kiểm tra Chat ID:**
```bash
pm2 conf pm2-telegram
# Xem telegram_chat_id có đúng không
```

3. **Kiểm tra logs:**
```bash
pm2 logs pm2-telegram --lines 50
```

4. **Test bot trực tiếp:**
```bash
# Gửi message test qua curl
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/sendMessage" \
  -d "chat_id=<YOUR_CHAT_ID>" \
  -d "text=Test message"
```

### Module không hoạt động:

```bash
# Reinstall module
pm2 uninstall pm2-telegram
pm2 install pm2-telegram

# Cấu hình lại
pm2 set pm2-telegram:telegram_token YOUR_BOT_TOKEN
pm2 set pm2-telegram:telegram_chat_id YOUR_CHAT_ID
pm2 set pm2-telegram:events restart,exit,stop,error
```

## Ví dụ cấu hình đầy đủ

```bash
# Cài đặt
pm2 install pm2-telegram

# Cấu hình
pm2 set pm2-telegram:telegram_token 123456789:ABCdefGHIjklMNOpqrsTUVwxyz
pm2 set pm2-telegram:telegram_chat_id 123456789
pm2 set pm2-telegram:events restart,exit,stop,error

# Test
pm2 restart mint-post

# Lưu
pm2 save
```

## Lưu ý

- Bot Token và Chat ID là thông tin nhạy cảm, không chia sẻ công khai
- Nếu bot bị xóa hoặc token bị revoke, cần tạo bot mới và cấu hình lại
- Module sẽ tự động gửi thông báo khi có events được cấu hình
- Có thể cấu hình nhiều Chat ID bằng cách dùng dấu phẩy: `chat_id1,chat_id2`

