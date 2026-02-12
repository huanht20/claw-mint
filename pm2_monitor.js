/**
 * PM2 Monitor Script
 * Monitor PM2 processes và gửi thông báo qua Telegram khi app dừng/crash
 * 
 * Cấu hình:
 * 1. Tạo Telegram bot: Tìm @BotFather trên Telegram, gửi /newbot
 * 2. Lấy Bot Token từ BotFather
 * 3. Lấy Chat ID: Tìm @userinfobot, gửi message bất kỳ để lấy Chat ID
 * 4. Cập nhật TELEGRAM_BOT_TOKEN và TELEGRAM_CHAT_ID bên dưới
 * 5. Chạy: pm2 start pm2_monitor.js --name pm2-monitor
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import https from 'https';

const execAsync = promisify(exec);

// ========== CẤU HÌNH ==========
const TELEGRAM_BOT_TOKEN = 'YOUR_BOT_TOKEN'; // Thay bằng Bot Token của bạn
const TELEGRAM_CHAT_ID = 'YOUR_CHAT_ID'; // Thay bằng Chat ID của bạn
const CHECK_INTERVAL = 30000; // Kiểm tra mỗi 30 giây (30000ms)
const APPS_TO_MONITOR = ['mint-post', 'link-wallet', 'index-agent']; // Danh sách apps cần monitor
// ==============================

let lastStatus = {};

/**
 * Gửi thông báo qua Telegram
 */
function sendTelegram(message) {
  if (!TELEGRAM_BOT_TOKEN || TELEGRAM_BOT_TOKEN === 'YOUR_BOT_TOKEN') {
    console.log('⚠️ Telegram chưa được cấu hình. Bỏ qua thông báo.');
    return;
  }

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
    let responseData = '';
    res.on('data', (chunk) => {
      responseData += chunk;
    });
    res.on('end', () => {
      if (res.statusCode === 200) {
        console.log(`✅ Telegram notification sent: ${message.substring(0, 50)}...`);
      } else {
        console.error(`❌ Telegram error ${res.statusCode}: ${responseData}`);
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ Telegram request error:', error.message);
  });

  req.write(data);
  req.end();
}

/**
 * Kiểm tra status của PM2 apps
 */
async function checkPM2Status() {
  try {
    const { stdout } = await execAsync('pm2 jlist');
    const apps = JSON.parse(stdout);

    for (const appName of APPS_TO_MONITOR) {
      const app = apps.find(a => a.name === appName);
      const lastAppStatus = lastStatus[appName];

      if (!app) {
        // App không tồn tại trong PM2
        if (lastAppStatus !== 'not_found') {
          sendTelegram(
            `⚠️ <b>PM2 Alert</b>\n` +
            `App <b>${appName}</b> không tìm thấy trong PM2!\n` +
            `Có thể app chưa được start hoặc đã bị xóa.`
          );
          lastStatus[appName] = 'not_found';
        }
        continue;
      }

      const currentStatus = app.pm2_env.status;
      const restartCount = app.pm2_env.restart_time || 0;

      // Kiểm tra nếu status thay đổi
      if (lastAppStatus && lastAppStatus !== currentStatus) {
        let message = '';
        
        if (currentStatus === 'stopped') {
          message = `🛑 <b>PM2 Alert</b>\n` +
                    `App <b>${appName}</b> đã dừng!\n` +
                    `Status: <code>${currentStatus}</code>\n` +
                    `Restarts: ${restartCount}`;
        } else if (currentStatus === 'errored') {
          message = `❌ <b>PM2 Alert</b>\n` +
                    `App <b>${appName}</b> gặp lỗi!\n` +
                    `Status: <code>${currentStatus}</code>\n` +
                    `Restarts: ${restartCount}\n` +
                    `\nKiểm tra logs: <code>pm2 logs ${appName}</code>`;
        } else if (currentStatus === 'online' && lastAppStatus === 'stopped') {
          message = `✅ <b>PM2 Alert</b>\n` +
                    `App <b>${appName}</b> đã được khởi động lại!\n` +
                    `Status: <code>${currentStatus}</code>`;
        }

        if (message) {
          sendTelegram(message);
        }
      }

      // Kiểm tra nếu restart quá nhiều lần
      if (restartCount > 10 && currentStatus === 'errored') {
        if (!lastStatus[`${appName}_restart_warning`]) {
          sendTelegram(
            `🚨 <b>PM2 Critical Alert</b>\n` +
            `App <b>${appName}</b> đã restart ${restartCount} lần!\n` +
            `Có thể có vấn đề nghiêm trọng. Vui lòng kiểm tra ngay!\n` +
            `\nKiểm tra logs: <code>pm2 logs ${appName}</code>`
          );
          lastStatus[`${appName}_restart_warning`] = true;
        }
      }

      lastStatus[appName] = currentStatus;
    }
  } catch (error) {
    console.error('❌ Error checking PM2 status:', error.message);
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 PM2 Monitor started');
  console.log(`📊 Monitoring apps: ${APPS_TO_MONITOR.join(', ')}`);
  console.log(`⏱️  Check interval: ${CHECK_INTERVAL / 1000} seconds`);
  
  if (TELEGRAM_BOT_TOKEN === 'YOUR_BOT_TOKEN') {
    console.log('⚠️  WARNING: Telegram chưa được cấu hình!');
    console.log('   Cập nhật TELEGRAM_BOT_TOKEN và TELEGRAM_CHAT_ID trong file này.');
  } else {
    console.log('✅ Telegram notifications enabled');
    // Gửi thông báo khi monitor start
    sendTelegram(
      `🚀 <b>PM2 Monitor Started</b>\n` +
      `Đang monitor các apps: ${APPS_TO_MONITOR.join(', ')}\n` +
      `Check interval: ${CHECK_INTERVAL / 1000} giây`
    );
  }

  // Kiểm tra ngay lập tức
  await checkPM2Status();

  // Kiểm tra định kỳ
  setInterval(async () => {
    await checkPM2Status();
  }, CHECK_INTERVAL);
}

// Xử lý lỗi không bắt được
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled rejection:', error);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
  sendTelegram(`💥 <b>PM2 Monitor Error</b>\nMonitor script gặp lỗi:\n<code>${error.message}</code>`);
  process.exit(1);
});

// Start monitor
main().catch(console.error);

