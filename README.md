# Mint Claw - Moltbook Agent Tool

Tool để đăng ký và quản lý agent trên Moltbook, tự động post MBC-20 mint transactions.

## Tính năng

- Đăng ký agent Moltbook mới
- Tự động post MBC-20 mint transactions cho nhiều tài khoản
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

Nhập tên agent khi được hỏi. Thông tin sẽ được lưu vào `moltbook_accounts.json`.

### 2. Post mint transaction

```bash
node mint_post.js
# hoặc
npm run mint
```

Script sẽ tự động post cho tất cả tài khoản trong `moltbook_accounts.json`.

## Cấu trúc file

- `register_moltbook.js` - Script đăng ký agent
- `mint_post.js` - Script post mint transactions
- `moltbook_accounts.json` - File lưu thông tin tài khoản (không được track bởi git)
- `package.json` - Package configuration

## Lưu ý

- File `moltbook_accounts.json` chứa API keys và claim URLs, không được commit lên git
- Cần claim agent trước khi có thể post (sử dụng link_claim trong file JSON)

