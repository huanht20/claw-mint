# Hướng dẫn sử dụng update_config.js

File `update_config.js` chứa các hàm tiện ích để cập nhật file `config.js` một cách tự động.

## 📋 Các hàm có sẵn

### 1. Quản lý Proxy

#### `updateProxyList(proxyList)`
Cập nhật toàn bộ danh sách proxy.

```javascript
import { updateProxyList } from './update_config.js';

const newProxies = [
  'http://user:pass@proxy1.com:8080',
  'http://user:pass@proxy2.com:8080',
  'http://user:pass@proxy3.com:8080'
];

await updateProxyList(newProxies);
```

#### `addProxy(proxyUrl)`
Thêm một proxy mới vào danh sách (nếu chưa có).

```javascript
import { addProxy } from './update_config.js';

await addProxy('http://user:pass@newproxy.com:8080');
```

#### `removeProxy(proxyUrl)`
Xóa một proxy khỏi danh sách.

```javascript
import { removeProxy } from './update_config.js';

await removeProxy('http://user:pass@oldproxy.com:8080');
```

#### `updateUseProxyFromConfig(value)`
Bật/tắt sử dụng proxy từ config.

```javascript
import { updateUseProxyFromConfig } from './update_config.js';

await updateUseProxyFromConfig(true);  // Bật
await updateUseProxyFromConfig(false); // Tắt
```

### 2. Cấu hình AI

#### `updateOpenAIApiKey(apiKey)`
Cập nhật OpenAI API key.

```javascript
import { updateOpenAIApiKey } from './update_config.js';

await updateOpenAIApiKey('sk-proj-your-new-api-key-here');
```

#### `updateUseAI(value)`
Bật/tắt tính năng AI.

```javascript
import { updateUseAI } from './update_config.js';

await updateUseAI(true);  // Bật AI
await updateUseAI(false); // Tắt AI
```

### 3. Cấu hình Mint

#### `updateMintData(mintData)`
Cập nhật nội dung mint_data (có thể nhiều dòng).

```javascript
import { updateMintData } from './update_config.js';

const newMintData = `{"p":"mbc-20","op":"mint","tick":"GPT","amt":"100"}

mbc20.xyz`;

await updateMintData(newMintData);
```

### 4. Cấu hình Delay

#### `updateDelayRegis(minutes)`
Cập nhật delay khi đăng ký (phút).

```javascript
import { updateDelayRegis } from './update_config.js';

await updateDelayRegis(120); // 120 phút
```

#### `updateDelayAfterDay(minutes)`
Cập nhật delay sau khi đăng ký được 1 ngày (phút).

```javascript
import { updateDelayAfterDay } from './update_config.js';

await updateDelayAfterDay(30); // 30 phút
```

### 5. Cấu hình khác

#### `updateMaxAccountsPerIP(maxAccounts)`
Cập nhật số account tối đa mỗi IP/proxy.

```javascript
import { updateMaxAccountsPerIP } from './update_config.js';

await updateMaxAccountsPerIP(5); // 5 accounts mỗi IP
```

#### `updateLimitWaiting(minutes)`
Cập nhật thời gian đợi sau khi đạt MAX_ACCOUNTS_PER_IP (phút).

```javascript
import { updateLimitWaiting } from './update_config.js';

await updateLimitWaiting(5); // 5 phút
```

## 🚀 Cách sử dụng

### Cách 1: Import và sử dụng trong file khác

Tạo một file script mới (ví dụ: `my_script.js`):

```javascript
import { updateProxyList, updateUseProxyFromConfig } from './update_config.js';

async function main() {
  try {
    // Update proxy list
    await updateProxyList([
      'http://user:pass@proxy1.com:8080',
      'http://user:pass@proxy2.com:8080'
    ]);
    
    // Bật proxy
    await updateUseProxyFromConfig(true);
    
    console.log('✅ Đã cập nhật config thành công!');
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
  }
}

main();
```

Chạy:
```bash
node my_script.js
```

### Cách 2: Sử dụng trực tiếp trong Node.js REPL

```bash
node
```

Sau đó:
```javascript
import('./update_config.js').then(async (module) => {
  const { updateProxyList } = module;
  await updateProxyList(['http://user:pass@proxy1.com:8080']);
});
```

### Cách 3: Sử dụng với Python script (update proxy live)

Bạn có thể kết hợp với script Python để tự động update proxy live:

```javascript
// update_proxy_from_python.js
import { updateProxyList } from './update_config.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function updateProxyFromPython() {
  try {
    // Chạy Python script để lấy danh sách proxy live
    const { stdout } = await execAsync('python3 update_proxy_live.py --output-json');
    const liveProxies = JSON.parse(stdout);
    
    // Update vào config.js
    await updateProxyList(liveProxies);
    
    console.log(`✅ Đã update ${liveProxies.length} proxy live vào config.js`);
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
  }
}

updateProxyFromPython();
```

## 📝 Ví dụ thực tế

### Ví dụ 1: Update proxy list từ kết quả test

```javascript
import { updateProxyList } from './update_config.js';

// Giả sử bạn đã test và có danh sách proxy live
const liveProxies = [
  'http://gmvjgsol:482ax6w3fy31@45.43.184.205:5879',
  'http://gmvjgsol:482ax6w3fy31@64.137.103.144:6732',
  'http://gmvjgsol:482ax6w3fy31@216.74.118.136:6291'
];

await updateProxyList(liveProxies);
```

### Ví dụ 2: Thêm proxy mới vào danh sách hiện có

```javascript
import { addProxy } from './update_config.js';

// Thêm proxy mới
await addProxy('http://gmvjgsol:482ax6w3fy31@new.proxy.com:8080');
```

### Ví dụ 3: Tắt proxy và cập nhật delay

```javascript
import { 
  updateUseProxyFromConfig, 
  updateDelayRegis 
} from './update_config.js';

// Tắt proxy
await updateUseProxyFromConfig(false);

// Tăng delay khi đăng ký lên 180 phút
await updateDelayRegis(180);
```

## ⚠️ Lưu ý

1. **Backup config.js trước khi update**: Các hàm sẽ ghi đè trực tiếp vào file `config.js`, nên hãy backup trước:
   ```bash
   cp config.js config.js.backup
   ```

2. **Kiểm tra kết quả**: Sau khi update, hãy mở file `config.js` để kiểm tra xem có đúng không.

3. **Xử lý lỗi**: Tất cả các hàm đều throw error nếu có vấn đề, nên nhớ dùng try-catch.

4. **Format**: Các hàm sẽ giữ nguyên format của file `config.js` (indentation, comments, etc.).

## 🔍 Xem file ví dụ

Xem file `example_update_config.js` để có ví dụ đầy đủ về cách sử dụng tất cả các hàm.

