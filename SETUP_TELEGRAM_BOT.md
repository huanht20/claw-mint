# Hướng Dẫn Setup Bot Telegram

## Bước 1: Tạo Bot với BotFather

### 1.1. Mở Telegram và tìm BotFather

1. Mở ứng dụng Telegram trên điện thoại hoặc máy tính
2. Tìm kiếm: **@BotFather** (bot chính thức của Telegram)
3. Nhấn **Start** hoặc gửi lệnh `/start`

### 1.2. Tạo bot mới

1. Gửi lệnh: `/newbot`
2. BotFather sẽ hỏi tên bot (name):
   ```
   Alright, a new bot. How are we going to call it? Please choose a name for your bot.
   ```
   - Nhập tên bot (ví dụ: `Config Manager Bot`)
   - Tên này sẽ hiển thị trong chat

3. BotFather sẽ hỏi username bot:
   ```
   Good. Now let's choose a username for your bot. It must end in `bot`. Like this, for example: TetrisBot or tetris_bot.
   ```
   - Nhập username (phải kết thúc bằng `bot`)
   - Ví dụ: `config_manager_bot` hoặc `myconfigbot`
   - Username phải **duy nhất** (nếu bị trùng, BotFather sẽ báo lỗi)

4. BotFather sẽ trả về **Bot Token**:
   ```
   Done! Congratulations on your new bot. You will find it at t.me/config_manager_bot. Use this token to access the HTTP API:
   
   123456789:ABCdefGHIjklMNOpqrsTUVwxyz
   
   Keep your token secure and store it safely, it can be used by anyone to control your bot.
   ```
   - **Copy token này lại** (sẽ dùng để cấu hình bot)

### 1.3. Lưu Token

Token có dạng: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`

⚠️ **QUAN TRỌNG:** 
- Token này là **bí mật**, không chia sẻ công khai
- Ai có token đều có thể điều khiển bot của bạn
- Nếu token bị lộ, hãy tạo bot mới

## Bước 2: Lấy Chat ID (User ID)

### Cách 1: Sử dụng @userinfobot (Đơn giản nhất)

1. Tìm bot **@userinfobot** trên Telegram
2. Gửi message bất kỳ (ví dụ: `/start`)
3. Bot sẽ trả về thông tin của bạn:
   ```
   ID: 123456789
   First name: Your Name
   ...
   ```
   - **ID** chính là Chat ID/User ID của bạn

### Cách 2: Sử dụng API

1. Gửi message bất kỳ cho bot của bạn (ví dụ: `/start`)
2. Truy cập URL (thay `YOUR_BOT_TOKEN` bằng token của bạn):
   ```
   https://api.telegram.org/botYOUR_BOT_TOKEN/getUpdates
   ```
3. Tìm trong response:
   ```json
   {
     "message": {
       "chat": {
         "id": 123456789,
         ...
       }
     }
   }
   ```
   - `"id"` chính là Chat ID của bạn

### Cách 3: Sử dụng bot @getidsbot

1. Tìm bot **@getidsbot** trên Telegram
2. Gửi `/start`
3. Bot sẽ trả về User ID của bạn

## Bước 3: Cấu Hình Bot Token

### Cách 1: Thêm vào config.js (Khuyến nghị)

1. Mở file `config.js`
2. Tìm dòng:
   ```javascript
   export const TELEGRAM_BOT_TOKEN = '';
   ```
3. Thêm token của bạn:
   ```javascript
   export const TELEGRAM_BOT_TOKEN = '123456789:ABCdefGHIjklMNOpqrsTUVwxyz';
   ```

### Cách 2: Sử dụng Environment Variable

```bash
export TELEGRAM_BOT_TOKEN="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
```

## Bước 4: Cấu Hình Allowed User IDs (Tùy chọn)

Nếu muốn giới hạn chỉ một số user được sử dụng bot:

### Cách 1: Thêm vào config.js

```javascript
export const TELEGRAM_ALLOWED_USER_IDS = [123456789, 987654321];
```

### Cách 2: Sử dụng Environment Variable

```bash
export TELEGRAM_ALLOWED_USER_IDS="123456789,987654321"
```

**Lưu ý:** Để trống `[]` nếu muốn cho phép tất cả user.

## Bước 5: Cài Đặt Dependencies

```bash
npm install
```

## Bước 6: Chạy Bot

### Chạy trực tiếp:

```bash
node telegram_bot.js
```

### Hoặc với npm:

```bash
npm run telegram-bot
```

### Hoặc với PM2 (cho VPS):

```bash
pm2 start telegram_bot.js --name telegram-bot
pm2 save
```

## Bước 7: Test Bot

1. Tìm bot của bạn trên Telegram (username bạn đã đặt)
2. Gửi lệnh `/start` hoặc `/menu`
3. Bot sẽ hiển thị menu:
   ```
   🔧 Quản lý Config
   
   Chọn chức năng:
   [📝 Update mint_data] [🌐 Thêm Proxy]
   [📊 Xem Config hiện tại]
   [❌ Hủy]
   ```

## Troubleshooting

### Bot không phản hồi

1. **Kiểm tra Bot Token:**
   ```bash
   # Xem token trong config.js
   cat config.js | grep TELEGRAM_BOT_TOKEN
   
   # Hoặc test token qua API
   curl "https://api.telegram.org/botYOUR_BOT_TOKEN/getMe"
   ```

2. **Kiểm tra bot đã được start chưa:**
   - Gửi `/start` cho bot trên Telegram
   - Bot phải phản hồi

3. **Kiểm tra logs:**
   ```bash
   # Nếu chạy với PM2
   pm2 logs telegram-bot
   
   # Hoặc xem console output
   ```

### Lỗi "Bạn không có quyền sử dụng bot này"

- Kiểm tra `TELEGRAM_ALLOWED_USER_IDS` trong config.js
- Đảm bảo User ID của bạn có trong danh sách
- Hoặc để trống `[]` để cho phép tất cả user

### Bot không cập nhật config

- Kiểm tra quyền ghi file trong thư mục project
- Kiểm tra file `config.js` có tồn tại không
- Xem logs để biết lỗi chi tiết

### Token không hợp lệ

- Kiểm tra token có đúng format không: `123456789:ABC...`
- Đảm bảo không có khoảng trắng thừa
- Thử tạo bot mới nếu token bị revoke

## Các Lệnh Bot

- `/start` - Bắt đầu bot và hiển thị menu
- `/menu` - Hiển thị menu chính

## Tính Năng Bot

✅ Update mint_data (hỗ trợ nhiều dòng)  
✅ Thêm proxy vào PROXY_LIST  
✅ Xem config hiện tại  
✅ Xác nhận trước khi cập nhật  
✅ Hủy bỏ thao tác  
✅ Bảo mật với ALLOWED_USER_IDS  

## Lưu Ý Bảo Mật

1. **KHÔNG** commit Bot Token lên GitHub
   - Thêm `config.js` vào `.gitignore` nếu chưa có
   - Hoặc sử dụng environment variables

2. **Giữ Token bí mật:**
   - Không chia sẻ token công khai
   - Nếu token bị lộ, tạo bot mới ngay

3. **Sử dụng ALLOWED_USER_IDS:**
   - Giới hạn chỉ user đáng tin cậy được sử dụng bot
   - Tránh bot bị lạm dụng

## Ví Dụ Cấu Hình Đầy Đủ

### config.js:

```javascript
// Cấu hình Telegram Bot
export const TELEGRAM_BOT_TOKEN = '123456789:ABCdefGHIjklMNOpqrsTUVwxyz';
export const TELEGRAM_ALLOWED_USER_IDS = [123456789]; // Chỉ user này được phép
```

### Chạy bot:

```bash
# Cài đặt
npm install

# Chạy
node telegram_bot.js

# Hoặc với PM2
pm2 start telegram_bot.js --name telegram-bot
pm2 save
```

## Tóm Tắt Các Bước

1. ✅ Tìm @BotFather → `/newbot` → Lấy token
2. ✅ Tìm @userinfobot → Lấy User ID
3. ✅ Thêm token vào `config.js`
4. ✅ (Tùy chọn) Thêm User IDs vào `TELEGRAM_ALLOWED_USER_IDS`
5. ✅ `npm install`
6. ✅ `node telegram_bot.js`
7. ✅ Test bot với `/start`

Chúc bạn setup thành công! 🎉

