# Hướng dẫn upload file lên VPS

## Cách 1: Sử dụng SCP với password (chạy trên máy local)

```bash
# Copy config.js
scp config.js root@207.148.116.58:~/project/claw-mint/

# Copy moltbook_accounts.json
scp moltbook_accounts.json root@207.148.116.58:~/project/claw-mint/
```

Sẽ hỏi password của VPS, nhập password và Enter.

## Cách 2: Sử dụng base64 (dễ copy/paste)

### Bước 1: Trên máy local, copy nội dung file base64:

**config.js.base64:**
```
[Chạy lệnh: cat config.js.base64 và copy toàn bộ nội dung]
```

**moltbook_accounts.json.base64:**
```
[Chạy lệnh: cat moltbook_accounts.json.base64 và copy toàn bộ nội dung]
```

### Bước 2: Trên VPS, decode và tạo file:

```bash
cd ~/project/claw-mint

# Tạo config.js
echo "[paste nội dung config.js.base64]" | base64 -d > config.js

# Tạo moltbook_accounts.json
echo "[paste nội dung moltbook_accounts.json.base64]" | base64 -d > moltbook_accounts.json
```

## Cách 3: Tạo file trực tiếp trên VPS với nano

Trên VPS, chạy:
```bash
cd ~/project/claw-mint
nano config.js
# Paste nội dung và Ctrl+X, Y, Enter để save

nano moltbook_accounts.json
# Paste nội dung và Ctrl+X, Y, Enter để save
```

