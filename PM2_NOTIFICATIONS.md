# PM2 Notifications - Thông báo khi app dừng

PM2 có thể gửi thông báo khi app bị dừng, crash, hoặc restart. Có nhiều cách để setup:

## Cách 1: Sử dụng PM2 Module (Khuyến nghị)

### 1.1. PM2 Telegram (Gửi thông báo qua Telegram)

```bash
# Cài đặt module
pm2 install pm2-telegram

# Cấu hình
pm2 set pm2-telegram:telegram_token YOUR_TELEGRAM_BOT_TOKEN
pm2 set pm2-telegram:telegram_chat_id YOUR_CHAT_ID
pm2 set pm2-telegram:events restart,exit,stop
```

**Lấy Telegram Bot Token:**
1. Tìm @BotFather trên Telegram
2. Gửi `/newbot` và làm theo hướng dẫn
3. Copy token được cung cấp

**Lấy Chat ID:**
1. Tìm @userinfobot trên Telegram
2. Gửi bất kỳ message nào
3. Copy Chat ID

### 1.2. PM2 Slack (Gửi thông báo qua Slack)

```bash
# Cài đặt module
pm2 install pm2-slack

# Cấu hình
pm2 set pm2-slack:slack_url YOUR_SLACK_WEBHOOK_URL
pm2 set pm2-slack:events restart,exit,stop
```

**Tạo Slack Webhook:**
1. Vào https://api.slack.com/apps
2. Tạo app mới → Incoming Webhooks
3. Copy Webhook URL

### 1.3. PM2 Mail (Gửi thông báo qua Email)

```bash
# Cài đặt module
pm2 install pm2-mail

# Cấu hình
pm2 set pm2-mail:from your-email@gmail.com
pm2 set pm2-mail:to recipient@example.com
pm2 set pm2-mail:host smtp.gmail.com
pm2 set pm2-mail:port 587
pm2 set pm2-mail:user your-email@gmail.com
pm2 set pm2-mail:pass your-app-password
pm2 set pm2-mail:events restart,exit,stop
```

## Cách 2: Sử dụng Ecosystem Config với Event Hooks

Cập nhật `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: 'mint-post',
      script: 'mint_post.js',
      // ... các config khác
      
      // Event hooks
      on_restart: 'echo "App restarted"',
      on_stop: 'echo "App stopped"',
      on_exit: 'echo "App exited"',
      
      // Hoặc chạy script thông báo
      on_restart: 'node notify.js restart',
      on_stop: 'node notify.js stop',
      on_exit: 'node notify.js exit',
    }
  ]
};
```

## Cách 3: Tự viết Script Monitor

Tạo file `monitor.js`:

```javascript
const { exec } = require('child_process');
const https = require('https');

// Cấu hình Telegram
const TELEGRAM_BOT_TOKEN = 'YOUR_BOT_TOKEN';
const TELEGRAM_CHAT_ID = 'YOUR_CHAT_ID';

function sendTelegram(message) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const data = JSON.stringify({
    chat_id: TELEGRAM_CHAT_ID,
    text: message,
    parse_mode: 'HTML'
  });

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };

  const req = https.request(url, options, (res) => {
    console.log(`Telegram notification sent: ${res.statusCode}`);
  });

  req.on('error', (error) => {
    console.error('Telegram notification error:', error);
  });

  req.write(data);
  req.end();
}

// Kiểm tra status mỗi 30 giây
setInterval(() => {
  exec('pm2 jlist', (error, stdout) => {
    if (error) {
      console.error('PM2 check error:', error);
      return;
    }

    try {
      const apps = JSON.parse(stdout);
      const mintPost = apps.find(app => app.name === 'mint-post');

      if (!mintPost) {
        sendTelegram('⚠️ <b>PM2 Alert</b>\nApp mint-post không tìm thấy!');
        return;
      }

      if (mintPost.pm2_env.status === 'stopped') {
        sendTelegram(`🛑 <b>PM2 Alert</b>\nApp mint-post đã dừng!\nStatus: ${mintPost.pm2_env.status}`);
      } else if (mintPost.pm2_env.status === 'errored') {
        sendTelegram(`❌ <b>PM2 Alert</b>\nApp mint-post gặp lỗi!\nStatus: ${mintPost.pm2_env.status}\nRestarts: ${mintPost.pm2_env.restart_time}`);
      }
    } catch (err) {
      console.error('Parse error:', err);
    }
  });
}, 30000); // Kiểm tra mỗi 30 giây
```

Chạy monitor:
```bash
pm2 start monitor.js --name monitor
pm2 save
```

## Cách 4: Sử dụng PM2 Plus (Dịch vụ trả phí)

PM2 Plus cung cấp monitoring và notifications đầy đủ:

```bash
# Đăng ký và login
pm2 link YOUR_SECRET_KEY YOUR_PUBLIC_KEY
```

## Cách 5: Sử dụng Webhook (Tự host)

Tạo API endpoint để nhận thông báo và gửi đi nơi khác (Telegram, Discord, etc.)

## Khuyến nghị Setup cho Project này

### Setup Telegram Notifications:

```bash
# 1. Cài đặt module
pm2 install pm2-telegram

# 2. Cấu hình (thay YOUR_BOT_TOKEN và YOUR_CHAT_ID)
pm2 set pm2-telegram:telegram_token YOUR_BOT_TOKEN
pm2 set pm2-telegram:telegram_chat_id YOUR_CHAT_ID
pm2 set pm2-telegram:events restart,exit,stop,error

# 3. Test
pm2 restart mint-post
# Sẽ nhận được thông báo trên Telegram

# 4. Lưu cấu hình
pm2 save
```

### Hoặc sử dụng Script Monitor (Tự viết):

1. Tạo file `notify.js` trong project
2. Cấu hình Telegram/Discord/Slack
3. Chạy với PM2: `pm2 start notify.js --name monitor`

## Kiểm tra Notifications

```bash
# Xem logs của module
pm2 logs pm2-telegram

# Xem cấu hình
pm2 conf pm2-telegram

# Test bằng cách restart app
pm2 restart mint-post
```

## Troubleshooting

### Module không hoạt động:
```bash
# Xem logs
pm2 logs pm2-telegram

# Reinstall module
pm2 uninstall pm2-telegram
pm2 install pm2-telegram
```

### Không nhận được thông báo:
- Kiểm tra Bot Token và Chat ID đúng chưa
- Kiểm tra events được cấu hình: `pm2 conf pm2-telegram`
- Test bằng cách restart app: `pm2 restart mint-post`

