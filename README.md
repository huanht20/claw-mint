# Mint Claw - Moltbook Agent Tool

Tool để đăng ký và quản lý agent trên Moltbook, tự động post MBC-20 mint transactions.

## Tính năng

- Đăng ký agent Moltbook mới
- Tự động post MBC-20 mint transactions cho nhiều tài khoản
- Thêm ký tự ngẫu nhiên vào nội dung và tiêu đề post (mỗi lần post khác nhau)
- Quản lý trạng thái account (status: 0 = tắt, 1 = bật)
- Tracking thời gian post cuối cùng (last_post)
- Quản lý delay giữa các lần post (tự động điều chỉnh dựa trên thời gian đăng ký)
- Tự động kiểm tra delay trước khi post (bỏ qua nếu chưa đủ thời gian)
- **Verification flow:** Tự động xử lý verification challenge (hỗ trợ AI hoặc nhập tay)
- **AI Integration:** Tự động giải verification challenge bằng ChatGPT (tùy chọn)
- Tự động index post sau khi post thành công (đợi 5 giây)
- Link wallet với agent để claim tokens (chỉ hiển thị account chưa link)
- Index agent theo tên
- **Rate limit handling:** Tự động dừng vòng mint khi gặp rate limit exceeded (vẫn tiếp tục vòng sau nếu có repeat)
- **Account management:** Tự động tắt account khi bị suspended/blocked
- **Logging:** Lưu log vào thư mục `log/` với format `mint_mbc20_YYYY-MM-DD.log`
- Lưu thông tin tài khoản vào file JSON (không được track bởi git)

## Cài đặt

```bash
# Cài đặt dependencies
npm install

# Hoặc nếu chưa có package.json, chỉ cần Node.js (ES modules)
```

## Cấu hình

### Cấu hình MBC-20 Mint và AI

Trước khi sử dụng, bạn cần tạo file `config.js` từ file mẫu:

```bash
cp config.example.js config.js
```

Sau đó chỉnh sửa file `config.js` để cấu hình:

```javascript
// Cấu hình MBC-20 mint
export const mint_data = `{"p":"mbc-20","op":"mint","tick":"CLAW","amt":"100"}`;

// Cấu hình AI (ChatGPT) để tự động trả lời verification
export const USE_AI = true; // Đặt true để bật AI tự động trả lời
export const OPENAI_API_KEY = 'sk-...'; // Nhập OpenAI API key của bạn

// Cấu hình delay cho đăng ký và sau khi đăng ký
export const DELAY_REGIS = 120; // Delay (phút) khi đăng ký mới account
export const DELAY_AFTER_DAY = 30; // Delay (phút) sau khi đăng ký được 1 ngày
```

**Các tham số:**
- `mint_data`: JSON string chứa thông tin mint transaction
  - `p`: Protocol (thường là "mbc-20")
  - `op`: Operation (thường là "mint")
  - `tick`: Token ticker (ví dụ: "CLAW")
  - `amt`: Số lượng mint (ví dụ: "100")
- `USE_AI`: Bật/tắt tính năng AI tự động giải verification challenge
- `OPENAI_API_KEY`: OpenAI API key (lấy từ https://platform.openai.com/api-keys)
- `DELAY_REGIS`: Delay mặc định khi đăng ký account mới (phút)
- `DELAY_AFTER_DAY`: Delay sau khi account đã đăng ký được 24 giờ (phút)

**Lưu ý:** File `config.js` không được commit lên git (đã có trong `.gitignore`), chỉ có `config.example.js` được track để làm mẫu.

## Sử dụng

### 1. Đăng ký agent mới

```bash
node register_moltbook.js
# hoặc
npm run register
```

Nhập tên agent khi được hỏi. Thông tin sẽ được lưu vào `moltbook_accounts.json` với:
- `status: 1` (mặc định, account sẽ được post)
- `last_post: 0` (timestamp của lần post cuối, 0 = chưa post)
- `wallet_link: null` (wallet address đã link, null = chưa link)
- `delay: DELAY_REGIS` (từ config, mặc định 120 phút)
- `registered_at: <timestamp>` (thời gian đăng ký, Unix timestamp giây)

**Tự động điều chỉnh delay:**
- Khi đăng ký mới: `delay = DELAY_REGIS` (120 phút)
- Sau 24 giờ: Tự động chuyển sang `delay = DELAY_AFTER_DAY` (30 phút)

### 2. Claim agent

**QUAN TRỌNG:** Trước khi có thể post, bạn phải claim agent bằng cách:

1. Mở file `moltbook_accounts.json`
2. Tìm `link_claim` của agent bạn muốn claim
3. Mở link đó trong trình duyệt (ví dụ: `https://moltbook.com/claim/moltbook_claim_...`)
4. Làm theo hướng dẫn trên trang web:
   - Xác thực email (tạo tài khoản để quản lý agent)
   - Đăng tweet để xác minh quyền sở hữu với verification code

Sau khi claim thành công, agent mới có thể post được.

### 3. Post mint transaction

**Chạy 1 lần:**
```bash
node mint_post.js
# hoặc
npm run mint
```

**Chạy lặp lại (theo phút):**
```bash
node mint_post.js <số_phút>
# Ví dụ: lặp lại mỗi 5 phút
node mint_post.js 5
# hoặc
npm run mint -- 5
```

Script sẽ tự động post cho tất cả tài khoản có `status = 1` trong `moltbook_accounts.json`.

**Tính năng:**
- Mỗi lần post sẽ có ký tự ngẫu nhiên (10 ký tự) trong nội dung và tiêu đề
- **Delay 12 giây** giữa các account để tránh rate limit
- Sau khi post thành công, tự động cập nhật `last_post` với timestamp hiện tại
- Đợi 5 giây rồi tự động gọi API index post (hiển thị màu xanh khi thành công, màu đỏ khi thất bại)
- Bỏ qua các account có `status = 0`
- **Kiểm tra delay:** Nếu thời gian từ lần post cuối < delay (phút), sẽ bỏ qua và hiển thị thời gian còn lại
- **Verification flow:** Nếu server yêu cầu verification:
  - Nếu `USE_AI = true`: Tự động giải challenge bằng AI
  - Nếu `USE_AI = false`: Hỏi user nhập câu trả lời
- **Rate limit handling:** Nếu gặp "Rate limit exceeded":
  - Dừng vòng mint hiện tại
  - Nếu có repeat mode: Vẫn tiếp tục vòng sau
  - Nếu không có repeat: Kết thúc chương trình
- **Account auto-disable:** Tự động set `status = 0` khi account bị suspended/blocked

**Cách quản lý account:**
- Để tắt một account, sửa `status: 0` trong `moltbook_accounts.json`
- Để bật lại, sửa `status: 1`
- Để thay đổi delay, sửa `delay: <số_phút>` (ví dụ: `delay: 60` = 60 phút)
- Delay sẽ tự động điều chỉnh dựa trên `registered_at`:
  - < 24 giờ: Sử dụng `DELAY_REGIS` (120 phút)
  - ≥ 24 giờ: Sử dụng `DELAY_AFTER_DAY` (30 phút)

**Chạy:**
- Nếu không có tham số: chạy 1 lần và dừng
- Nếu có tham số (số phút): sẽ lặp lại mint sau mỗi khoảng thời gian đó
- Nhấn `Ctrl+C` để dừng khi đang chạy lặp lại

**Tổng kết:**
- Hiển thị số lần post thực tế (thành công + thất bại)
- Màu xanh cho thành công, màu đỏ cho thất bại
- Phân cách rõ ràng giữa các account

### 4. Link wallet với agent

```bash
node link_wallet.js
# hoặc
npm run link
```

Script sẽ:
1. **Chỉ hiển thị các account chưa link wallet** (wallet_link = null, status = 1, và đủ delay)
2. Hỏi bạn chọn account nào để link (nhập số hoặc 'all' để chọn tất cả)
3. Hỏi wallet address (ví dụ: `0xeBac9445C00F1B1967b527DdC94FeCF72283725C`)
4. Kiểm tra delay trước khi post (bỏ qua nếu chưa đủ thời gian)
5. Tự động post message link wallet cho account đã chọn
6. Sau khi post thành công, tự động cập nhật `wallet_link` và `last_post`
7. Đợi 5 giây rồi tự động index post

**Tính năng:**
- Tiêu đề post: "Link wallet {10 ký tự ngẫu nhiên}"
- Nội dung: JSON với format `{"p":"mbc-20","op":"link","wallet":"..."}` + `mbc20.xyz`
- Post này sẽ cho phép wallet owner claim mbc-20 token balances as ERC-20 tokens on Base

### 5. Index agent theo tên

```bash
node index_agent.js
```

Script sẽ:
1. Hiển thị danh sách tất cả accounts
2. Hỏi bạn chọn account(s) để index (nhập số hoặc 'all')
3. Gọi API index agent cho từng account đã chọn
4. Hiển thị kết quả (màu xanh khi thành công, màu đỏ khi thất bại)

## Cấu trúc file

- `register_moltbook.js` - Script đăng ký agent
- `mint_post.js` - Script post mint transactions với verification, AI, và index post
- `link_wallet.js` - Script link wallet với agent
- `index_agent.js` - Script index agent theo tên
- `test_ai.js` - Script test chức năng AI verification
- `config.example.js` - File mẫu cấu hình MBC-20 mint và AI
- `config.js` - File cấu hình thực tế (không được track bởi git, cần copy từ config.example.js)
- `moltbook_accounts.json` - File lưu thông tin tài khoản (không được track bởi git)
- `log/` - Thư mục chứa log files (format: `mint_mbc20_YYYY-MM-DD.log`)
- `package.json` - Package configuration

### Cấu trúc `moltbook_accounts.json`

```json
[
  {
    "name": "agent_name",
    "api_key": "moltbook_sk_...",
    "link_claim": "https://moltbook.com/claim/...",
    "status": 1,
    "last_post": 1735689600,
    "wallet_link": "0xeBac9445C00F1B1967b527DdC94FeCF72283725C",
    "delay": 30,
    "registered_at": 1735689600,
    "using_proxy": 0,
    "proxy": null,
    "status_updated_at": null,
    "status_hint": null
  }
]
```

**Các field:**
- `status`: 0 = tắt (không post), 1 = bật (sẽ post)
- `last_post`: Unix timestamp (giây) của lần post cuối cùng, 0 = chưa post
- `wallet_link`: Wallet address đã link, `null` = chưa link wallet
- `delay`: Thời gian delay giữa các lần post (tính bằng phút), tự động điều chỉnh dựa trên `registered_at`
- `registered_at`: Unix timestamp (giây) của thời gian đăng ký, dùng để tự động điều chỉnh delay
- `using_proxy`: 0 = không dùng proxy, 1 = dùng proxy
- `proxy`: Proxy URL (ví dụ: `http://proxy.example.com:8080`), `null` = không có
- `status_updated_at`: Thời gian cập nhật status (khi bị suspended/blocked)
- `status_hint`: Hint từ server khi account bị suspended/blocked

## Logging

Log files được lưu vào thư mục `log/` với format:
- Tên file: `mint_mbc20_YYYY-MM-DD.log`
- Mỗi ngày một file riêng
- Format log: `[timestamp] [account_name] [action]` + JSON data

**Các loại log:**
- `POST_RESPONSE`: Response từ server khi post
- `POST_FAILED`: Post thất bại
- `VERIFY_RESPONSE`: Response từ server khi verify
- `AI_REQUEST`: Câu hỏi gửi cho AI
- `AI_RESPONSE`: Câu trả lời từ AI
- `AI_RESULT`: Kết quả đã format từ AI
- `AI_ERROR`: Lỗi khi gọi AI
- `USER_INPUT`: Input từ user (khi không dùng AI)
- `RATE_LIMIT_EXCEEDED`: Rate limit exceeded
- `ACCOUNT_SUSPENDED`: Account bị suspended
- `ACCOUNT_BLOCKED`: Account bị blocked
- `ERROR`: Lỗi khác

## Lưu ý

- File `moltbook_accounts.json` chứa API keys và claim URLs, không được commit lên git
- File `config.js` chứa cấu hình và API keys, không được commit lên git
- **Bắt buộc:** Phải claim agent trước khi có thể post (sử dụng `link_claim` trong file JSON)
- Mỗi lần post sẽ có nội dung và tiêu đề khác nhau nhờ ký tự ngẫu nhiên
- Script tự động cập nhật `last_post` sau mỗi lần post thành công (mint post và link wallet)
- **Delay:** Script sẽ tự động kiểm tra và bỏ qua account nếu chưa đủ thời gian delay kể từ lần post cuối
- **Delay tự động:** Delay sẽ tự động chuyển từ `DELAY_REGIS` (120 phút) sang `DELAY_AFTER_DAY` (30 phút) sau 24 giờ
- Để tạm dừng một account, đặt `status: 0` trong file JSON
- Để thay đổi delay, sửa `delay: <số_phút>` trong file JSON (ví dụ: `delay: 60` = 60 phút)
- Link wallet chỉ hiển thị các account chưa link wallet (`wallet_link = null`)
- **AI Verification:** Cần cấu hình `OPENAI_API_KEY` trong `config.js` để sử dụng tính năng AI
- **Rate limit:** Script tự động dừng vòng mint khi gặp rate limit exceeded, nhưng vẫn tiếp tục vòng sau nếu có repeat mode
- **Account auto-disable:** Account sẽ tự động bị tắt (`status = 0`) khi bị suspended/blocked, với thông tin `status_updated_at` và `status_hint`
