# Cách Bot Telegram Tương Tác Với config.js

## Tổng Quan

Bot Telegram tương tác với file `config.js` theo 2 hướng:
1. **ĐỌC** config: Để hiển thị thông tin và kiểm tra giá trị hiện tại
2. **GHI** config: Để cập nhật `mint_data` và `PROXY_LIST`

## Flow Tương Tác

### 1. ĐỌC Config (Read)

```
Bot khởi động
    ↓
reloadConfig() được gọi
    ↓
Đọc file config.js bằng readFile()
    ↓
Parse nội dung bằng regex để extract:
  - PROXY_LIST
  - mint_data
  - TELEGRAM_BOT_TOKEN
  - TELEGRAM_ALLOWED_USER_IDS
    ↓
Lưu vào biến trong memory
```

**Code trong `telegram_bot.js`:**
```javascript
async function reloadConfig() {
  // 1. Đọc file
  const configContent = await readFile('./config.js', 'utf-8');
  
  // 2. Parse PROXY_LIST
  const proxyListMatch = configContent.match(/export const PROXY_LIST = \[([\s\S]*?)\];/);
  if (proxyListMatch) {
    PROXY_LIST = proxyListMatch[1]
      .split(',')
      .map(p => p.trim().replace(/['"]/g, ''))
      .filter(p => p);
  }
  
  // 3. Parse mint_data
  const mintDataMatch = configContent.match(/export const mint_data = `([\s\S]*?)`;/);
  if (mintDataMatch) {
    mint_data = mintDataMatch[1];
  }
  
  // ... tương tự cho các giá trị khác
}
```

### 2. GHI Config (Write)

```
User chọn "Update mint_data" hoặc "Thêm Proxy"
    ↓
User nhập dữ liệu
    ↓
User xác nhận
    ↓
Bot gọi hàm từ update_config.js:
  - updateMintData() hoặc
  - addProxy()
    ↓
Hàm đọc config.js → Parse → Thay thế → Ghi lại
    ↓
Bot gọi reloadConfig() để đọc lại config mới
    ↓
Bot hiển thị kết quả cho user
```

**Code trong `update_config.js`:**
```javascript
export async function updateMintData(mintData) {
  // 1. Đọc file
  let content = await readConfigFile();
  
  // 2. Tìm và thay thế
  const regex = /export const mint_data = `[\s\S]*?`;/;
  content = content.replace(
    regex,
    `export const mint_data = \`${escapedMintData}\`;`
  );
  
  // 3. Ghi lại file
  await writeConfigFile(content);
}
```

## Chi Tiết Các Hàm

### reloadConfig() - Đọc Config

**Vị trí:** `telegram_bot.js`

**Chức năng:**
- Đọc file `config.js` từ disk
- Parse nội dung bằng regex để extract các giá trị
- Lưu vào biến trong memory (PROXY_LIST, mint_data, etc.)

**Khi nào được gọi:**
1. Khi bot khởi động
2. Sau khi update mint_data
3. Sau khi thêm proxy
4. Khi user xem config (để đảm bảo data mới nhất)

### updateMintData() - Ghi mint_data

**Vị trí:** `update_config.js`

**Chức năng:**
- Đọc file `config.js`
- Tìm và thay thế `mint_data` bằng giá trị mới
- Ghi lại file

**Cách hoạt động:**
```javascript
// Tìm pattern: export const mint_data = `...`;
const regex = /export const mint_data = `[\s\S]*?`;/;

// Thay thế bằng giá trị mới
content = content.replace(regex, `export const mint_data = \`${newValue}\`;`);

// Ghi lại file
await writeFile('./config.js', content, 'utf-8');
```

### addProxy() - Thêm Proxy

**Vị trí:** `update_config.js`

**Chức năng:**
- Đọc file `config.js`
- Parse PROXY_LIST hiện tại
- Kiểm tra proxy đã tồn tại chưa
- Thêm proxy mới vào danh sách
- Ghi lại file

**Cách hoạt động:**
```javascript
// 1. Parse PROXY_LIST hiện tại
const proxyListMatch = content.match(/export const PROXY_LIST = \[([\s\S]*?)\];/);
const currentProxies = proxyListMatch[1]
  .split(',')
  .map(p => p.trim().replace(/['"]/g, ''))
  .filter(p => p);

// 2. Thêm proxy mới
currentProxies.push(newProxyUrl);

// 3. Tạo lại PROXY_LIST string
const proxyListString = currentProxies.map(p => `    '${p}'`).join(',\n');

// 4. Thay thế trong file
content = content.replace(
  /export const PROXY_LIST = \[[\s\S]*?\];/,
  `export const PROXY_LIST = [\n${proxyListString}\n];`
);

// 5. Ghi lại file
await writeFile('./config.js', content, 'utf-8');
```

## Ví Dụ Flow Hoàn Chỉnh

### Scenario 1: User Update mint_data

```
1. User gửi /start → Bot hiển thị menu
2. User chọn "📝 Update mint_data"
3. User gửi nội dung mint_data mới
4. User nhấn "✅ Hoàn tất"
5. Bot hiển thị preview
6. User nhấn "✅ Xác nhận"
7. Bot gọi: await updateMintData(newData)
   → update_config.js đọc config.js
   → Thay thế mint_data
   → Ghi lại config.js
8. Bot gọi: await reloadConfig()
   → Đọc lại config.js
   → Cập nhật biến mint_data trong memory
9. Bot thông báo: "✅ Đã cập nhật mint_data thành công!"
```

### Scenario 2: User Thêm Proxy

```
1. User chọn "🌐 Thêm Proxy"
2. User gửi proxy URL: "http://user:pass@host:port"
3. Bot validate format
4. Bot hiển thị preview
5. User nhấn "✅ Xác nhận"
6. Bot gọi: await addProxy(proxyUrl)
   → update_config.js đọc config.js
   → Parse PROXY_LIST hiện tại
   → Thêm proxy mới
   → Ghi lại config.js
7. Bot gọi: await reloadConfig()
   → Đọc lại config.js
   → Cập nhật PROXY_LIST trong memory
8. Bot thông báo: "✅ Đã thêm proxy thành công!"
```

## Lưu Ý Quan Trọng

### 1. File Locking
- Node.js không có file locking mặc định
- Nếu nhiều process cùng ghi config.js, có thể gây conflict
- **Giải pháp:** Chỉ chạy 1 instance bot tại một thời điểm

### 2. Error Handling
- Nếu file config.js bị corrupt, bot sẽ báo lỗi
- Bot sẽ không crash, chỉ log error và tiếp tục hoạt động

### 3. Reload Timing
- Bot reload config sau mỗi lần update
- Điều này đảm bảo data trong memory luôn sync với file

### 4. Regex Parsing
- Bot sử dụng regex để parse config.js
- Nếu format config.js thay đổi, regex có thể không match
- **Lưu ý:** Giữ format config.js đúng chuẩn

## Cải Thiện Có Thể Thực Hiện

### 1. Watch File Changes
Có thể thêm file watcher để tự động reload khi config.js thay đổi từ bên ngoài:

```javascript
import { watch } from 'fs';

watch('./config.js', async (eventType) => {
  if (eventType === 'change') {
    console.log('📝 Config file changed, reloading...');
    await reloadConfig();
  }
});
```

### 2. Backup Before Write
Tạo backup trước khi ghi:

```javascript
async function writeConfigFile(content) {
  // Backup
  const backup = await readFile('./config.js', 'utf-8');
  await writeFile('./config.js.backup', backup, 'utf-8');
  
  // Write new content
  await writeFile('./config.js', content, 'utf-8');
}
```

### 3. Validation
Validate dữ liệu trước khi ghi:

```javascript
function validateMintData(data) {
  // Check format, length, etc.
  if (data.length > 10000) {
    throw new Error('mint_data quá dài');
  }
  // ...
}
```

## Tóm Tắt

- **ĐỌC:** Bot đọc config.js bằng `readFile()` và parse bằng regex
- **GHI:** Bot gọi hàm từ `update_config.js` để ghi vào config.js
- **RELOAD:** Sau mỗi lần ghi, bot reload config để sync memory với file
- **SAFE:** Bot có error handling để không crash khi có lỗi

