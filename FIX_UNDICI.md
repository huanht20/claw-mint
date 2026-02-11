# Sửa lỗi undici trên VPS

## Lỗi:
```
ReferenceError: File is not defined
    at Object.<anonymous> (/root/project/claw-mint/node_modules/undici/lib/web/webidl/index.js:534:48)
```

## Nguyên nhân:
- `undici` version 7.x yêu cầu Node.js >= 20.x hoặc có vấn đề tương thích với Node.js 18.x

## Giải pháp:

### Cách 1: Downgrade undici về version 6.x (Khuyến nghị)

Trên VPS, chạy:
```bash
cd ~/project/claw-mint

# Xóa node_modules và package-lock.json
rm -rf node_modules package-lock.json

# Cài đặt lại với version cũ hơn
npm install undici@^6.19.8

# Hoặc cài đặt tất cả dependencies
npm install
```

### Cách 2: Update Node.js lên version 20.x

```bash
# Sử dụng nvm
nvm install 20
nvm use 20

# Xóa và cài lại dependencies
rm -rf node_modules package-lock.json
npm install
```

### Cách 3: Sử dụng native fetch (Node.js 18+)

Nếu không cần proxy, có thể sử dụng native fetch của Node.js 18+ thay vì undici.

## Sau khi sửa, chạy lại:
```bash
node mint_post.js
```

