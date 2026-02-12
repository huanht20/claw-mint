# Setup Telegram Bot để Quản lý Config

## Bước 1: Tạo Telegram Bot

1. Mở Telegram và tìm **@BotFather**
2. Gửi lệnh: `/newbot`
3. Làm theo hướng dẫn:
   - Nhập tên bot (ví dụ: `Config Manager Bot`)
   - Nhập username bot (phải kết thúc bằng `bot`, ví dụ: `config_manager_bot`)
4. BotFather sẽ cung cấp **Bot Token**, copy lại (ví dụ: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

## Bước 2: Cấu hình Bot Token

### Cách 1: Sử dụng Environment Variable (Khuyến nghị)

```bash
export TELEGRAM_BOT_TOKEN="your_bot_token_here"
```

### Cách 2: Thêm vào config.js

Thêm vào file `config.js`:

```javascript
export const TELEGRAM_BOT_TOKEN = 'your_bot_token_here';
```

Sau đó sửa file `telegram_bot.js` để import từ config:

```javascript
import { TELEGRAM_BOT_TOKEN } from './config.js';
```

## Bước 3: Cấu hình User IDs được phép (Tùy chọn)

Nếu muốn giới hạn chỉ một số user được sử dụng bot:

```bash
export TELEGRAM_ALLOWED_USER_IDS="123456789,987654321"
```

Để lấy User ID:
1. Tìm **@userinfobot** trên Telegram
2. Gửi message bất kỳ
3. Bot sẽ trả về User ID của bạn

**Lưu ý:** Nếu không set `TELEGRAM_ALLOWED_USER_IDS`, bot sẽ cho phép tất cả user sử dụng.

## Bước 4: Cài đặt Dependencies

```bash
npm install
```

## Bước 5: Chạy Bot

```bash
node telegram_bot.js
```

Hoặc với PM2:

```bash
pm2 start telegram_bot.js --name telegram-bot
pm2 save
```

## Bước 6: Sử dụng Bot

1. Tìm bot của bạn trên Telegram (username bạn đã đặt)
2. Gửi lệnh `/start` hoặc `/menu`
3. Chọn chức năng từ menu:
   - **📝 Update mint_data**: Cập nhật nội dung mint_data
   - **🌐 Thêm Proxy**: Thêm proxy mới vào PROXY_LIST
   - **📊 Xem Config hiện tại**: Xem thông tin config hiện tại

## Hướng dẫn sử dụng

### Update mint_data

1. Chọn "📝 Update mint_data"
2. Gửi nội dung mint_data (có thể nhiều dòng):
   - Gửi tất cả trong một message, hoặc
   - Gửi từng dòng, sau đó nhấn "✅ Hoàn tất"
3. Xem preview và xác nhận
4. Bot sẽ cập nhật config.js

### Thêm Proxy

1. Chọn "🌐 Thêm Proxy"
2. Gửi proxy URL (ví dụ: `http://user:pass@host:port`)
3. Xem preview và xác nhận
4. Bot sẽ thêm proxy vào PROXY_LIST trong config.js

### Xem Config

1. Chọn "📊 Xem Config hiện tại"
2. Bot sẽ hiển thị:
   - Nội dung mint_data (preview)
   - Số lượng proxy
   - Danh sách proxy (5 proxy đầu tiên)

## Troubleshooting

### Bot không phản hồi

1. **Kiểm tra Bot Token:**
   ```bash
   echo $TELEGRAM_BOT_TOKEN
   ```

2. **Kiểm tra logs:**
   ```bash
   pm2 logs telegram-bot
   ```

3. **Test bot trực tiếp:**
   ```bash
   curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getMe"
   ```

### Lỗi "Bạn không có quyền sử dụng bot này"

- Kiểm tra `TELEGRAM_ALLOWED_USER_IDS` có đúng User ID của bạn không
- Hoặc xóa `TELEGRAM_ALLOWED_USER_IDS` để cho phép tất cả user

### Bot không cập nhật config

- Kiểm tra quyền ghi file trong thư mục project
- Kiểm tra file `config.js` có tồn tại không
- Xem logs để biết lỗi chi tiết

## Lưu ý bảo mật

- **KHÔNG** commit Bot Token lên GitHub
- Sử dụng environment variables hoặc file `.env` (và thêm vào `.gitignore`)
- Nếu sử dụng `ALLOWED_USER_IDS`, chỉ cho phép user đáng tin cậy
- Bot Token có quyền truy cập vào bot, giữ bí mật

## Ví dụ cấu hình đầy đủ

```bash
# 1. Set Bot Token
export TELEGRAM_BOT_TOKEN="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"

# 2. Set Allowed User IDs (tùy chọn)
export TELEGRAM_ALLOWED_USER_IDS="123456789"

# 3. Cài đặt dependencies
npm install

# 4. Chạy bot
node telegram_bot.js

# Hoặc với PM2
pm2 start telegram_bot.js --name telegram-bot
pm2 save
```

## Các lệnh Telegram

- `/start` - Bắt đầu bot và hiển thị menu
- `/menu` - Hiển thị menu chính

## Tính năng

✅ Update mint_data (hỗ trợ nhiều dòng)  
✅ Thêm proxy vào PROXY_LIST  
✅ Xem config hiện tại  
✅ Xác nhận trước khi cập nhật  
✅ Hủy bỏ thao tác  
✅ Bảo mật với ALLOWED_USER_IDS  
✅ Inline keyboard menu  
✅ Preview trước khi lưu  

