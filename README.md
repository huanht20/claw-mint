# Mint Claw - Moltbook Agent Tool

Tool để đăng ký và quản lý agent trên Moltbook, tự động post MBC-20 mint transactions.

## Tính năng

- Đăng ký agent Moltbook mới
- Tự động post MBC-20 mint transactions cho nhiều tài khoản
- Thêm ký tự ngẫu nhiên vào nội dung và tiêu đề post (mỗi lần post khác nhau)
- Quản lý trạng thái account (status: 0 = tắt, 1 = bật)
- Tracking thời gian post cuối cùng (last_post)
- Tự động index post sau khi post thành công (đợi 5 giây)
- Link wallet với agent để claim tokens
- Lưu thông tin tài khoản vào file JSON (không được track bởi git)

## Cài đặt

```bash
# Không cần cài đặt dependencies, chỉ cần Node.js
```

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

Script sẽ tự động post cho tất cả tài khoản có `status !== 0` trong `moltbook_accounts.json`.

**Tính năng:**
- Mỗi lần post sẽ có ký tự ngẫu nhiên (10 ký tự) trong nội dung và tiêu đề
- Hiển thị body JSON trước khi post
- Sau khi post thành công, tự động cập nhật `last_post` với timestamp hiện tại
- Đợi 5 giây rồi tự động gọi API index post
- Bỏ qua các account có `status = 0`

**Cách quản lý account:**
- Để tắt một account, sửa `status: 0` trong `moltbook_accounts.json`
- Để bật lại, sửa `status: 1`

**Chạy:**
- Nếu không có tham số: chạy 1 lần và dừng
- Nếu có tham số (số phút): sẽ lặp lại mint sau mỗi khoảng thời gian đó
- Nhấn `Ctrl+C` để dừng khi đang chạy lặp lại

### 4. Link wallet với agent

```bash
node link_wallet.js
# hoặc
npm run link
```

Script sẽ:
1. Hiển thị danh sách tất cả accounts
2. Hỏi bạn chọn account nào để link (nhập số hoặc 'all' để chọn tất cả)
3. Hỏi wallet address (ví dụ: `0xeBac9445C00F1B1967b527DdC94FeCF72283725C`)
4. Tự động post message link wallet cho account đã chọn

Post này sẽ cho phép wallet owner claim mbc-20 token balances as ERC-20 tokens on Base.

## Cấu trúc file

- `register_moltbook.js` - Script đăng ký agent
- `mint_post.js` - Script post mint transactions với ký tự ngẫu nhiên và index post
- `link_wallet.js` - Script link wallet với agent
- `moltbook_accounts.json` - File lưu thông tin tài khoản (không được track bởi git)
- `package.json` - Package configuration

### Cấu trúc `moltbook_accounts.json`

```json
[
  {
    "name": "agent_name",
    "api_key": "moltbook_sk_...",
    "link_claim": "https://moltbook.com/claim/...",
    "status": 1,
    "last_post": 1735689600
  }
]
```

- `status`: 0 = tắt (không post), 1 = bật (sẽ post)
- `last_post`: Unix timestamp (giây) của lần post cuối cùng, 0 = chưa post

## Lưu ý

- File `moltbook_accounts.json` chứa API keys và claim URLs, không được commit lên git
- **Bắt buộc:** Phải claim agent trước khi có thể post (sử dụng `link_claim` trong file JSON)
- Mỗi lần post sẽ có nội dung và tiêu đề khác nhau nhờ ký tự ngẫu nhiên
- Script tự động cập nhật `last_post` sau mỗi lần post thành công
- Để tạm dừng một account, đặt `status: 0` trong file JSON

